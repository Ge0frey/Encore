#!/usr/bin/env python3
"""
ENCORE — compute per-match "track" data from the ingested TxLINE archive.

Reads  data/archive/fixtures.json + data/archive/<id>/{odds,scores}.json
Writes data/tracks.json — one compact record per match:
  waveform (per-minute market volatility), prob timeline, quakes (market shocks
  = goal candidates), real score events where retention allowed, playlist
  metrics, and templated narration lines.
"""
import json
import math
import os
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE = os.path.join(ROOT, "data", "archive")
# Write straight into the app's data dir — encore/data/tracks.json is the single copy.
OUT = os.path.join(os.path.dirname(ROOT), "data", "tracks.json")

MINUTES = 135          # track length: 0' .. 135' (covers ET; PSO squashed at end)
QUAKE_PCT = 7.0        # min single-step jump in a team's win % to register a quake
GOAL_STATS = {"1": "p1", "2": "p2"}  # full-game goal stat keys


def stage_for(start_ms):
    day = start_ms // 86400000  # epoch day
    # WC2026: group ..Jun27 | R32 ..Jul3 | R16 ..Jul7 | QF ..Jul11 | SF ..Jul16 | Bronze Jul18 | Final Jul19
    if day <= 20631: return "Group Stage"
    if day <= 20637: return "Round of 32"
    if day <= 20641: return "Round of 16"
    if day <= 20645: return "Quarter-final"
    if day <= 20650: return "Semi-final"
    if day <= 20652: return "Third Place"
    return "Final"


def load(fid, name):
    p = os.path.join(ARCHIVE, str(fid), name)
    if not os.path.exists(p):
        return []
    with open(p) as f:
        return json.load(f)


def fnum(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def compute_track(fx):
    fid = fx["FixtureId"]
    odds = load(fid, "odds.json")
    scores = load(fid, "scores.json")
    start = fx["StartTime"]

    # --- full-time 1X2 consensus series -------------------------------------
    x12 = []
    for o in odds:
        if o["SuperOddsType"] != "1X2_PARTICIPANT_RESULT" or o.get("MarketPeriod"):
            continue
        pct = o.get("Pct") or []
        if len(pct) != 3:
            continue
        vals = [fnum(v) for v in pct]
        if any(v is None for v in vals):
            continue
        x12.append((o["Ts"], vals[0], vals[1], vals[2], bool(o.get("InRunning"))))
    x12.sort(key=lambda r: r[0])
    if len(x12) < 30:
        return None  # dead/duplicate fixture

    pre = [r for r in x12 if not r[4] and r[0] < start]
    opening = pre[-1] if pre else x12[0]
    live = [r for r in x12 if r[0] >= start]
    if len(live) < 20:
        return None
    closing = live[-1]

    def minute(ts):
        return max(0.0, min(MINUTES - 1e-6, (ts - start) / 60000.0))

    # --- waveform: per-minute sum of |delta pct| across the 3 outcomes ------
    wave = [0.0] * MINUTES
    prob = []  # downsampled probability timeline [min, p1, draw, p2]
    quakes = []
    prev = None
    last_kept = -10.0
    for ts, p1, dr, p2, inr in live:
        m = minute(ts)
        if prev is not None:
            d1, dd, d2 = p1 - prev[1], dr - prev[2], p2 - prev[3]
            wave[int(m)] += abs(d1) + abs(dd) + abs(d2)
            jump = max(abs(d1), abs(d2))
            if jump >= QUAKE_PCT:
                side = "p1" if d1 > 0 else "p2"
                if abs(d2) > abs(d1):
                    side = "p2" if d2 > 0 else "p1"
                quakes.append({"min": round(m, 1), "side": side, "mag": round(jump, 1)})
        if m - last_kept >= 0.5:
            prob.append([round(m, 1), round(p1, 1), round(dr, 1), round(p2, 1)])
            last_kept = m
        prev = (ts, p1, dr, p2)

    # merge quakes closer than 2 minutes on the same side (odds settle in steps)
    merged = []
    for q in quakes:
        if merged and q["side"] == merged[-1]["side"] and q["min"] - merged[-1]["min"] < 2.0:
            merged[-1]["mag"] = max(merged[-1]["mag"], q["mag"])
        else:
            merged.append(q)
    quakes = merged

    # --- real score events (when retention allowed) --------------------------
    goals = []
    cards = []
    final_score = None
    have_scores = False
    if scores:
        have_scores = True
        prev_stats = {}
        for s in scores:
            stats = s.get("Stats") or {}
            clock = (s.get("Clock") or {}).get("Seconds")
            m = (clock / 60.0) if clock is not None else minute(s["Ts"])
            for key, side in GOAL_STATS.items():
                v = stats.get(key)
                if v is not None and v > prev_stats.get(key, 0):
                    goals.append({"min": round(m, 1), "side": side})
            for key, side in (("5", "p1"), ("6", "p2")):
                v = stats.get(key)
                if v is not None and v > prev_stats.get(key, 0):
                    cards.append({"min": round(m, 1), "side": side, "type": "red"})
            for key, v in stats.items():
                if v is not None:
                    prev_stats[key] = max(prev_stats.get(key, 0), v)
        final_score = [prev_stats.get("1", 0), prev_stats.get("2", 0)]

    # --- outcome & inference for score-purged matches ------------------------
    c1, cd, c2 = closing[1], closing[2], closing[3]
    if c1 > 85: outcome = "p1"
    elif c2 > 85: outcome = "p2"
    elif cd > 85: outcome = "draw"
    else: outcome = max([("p1", c1), ("draw", cd), ("p2", c2)], key=lambda t: t[1])[0]
    if not have_scores:
        # Score events beyond the API retention window: don't fabricate a
        # scoreline — keep market shockwaves as the only "goals" and show
        # outcome only ("bootleg recording").
        goals = [{"min": q["min"], "side": q["side"], "inferred": True} for q in quakes]
        final_score = None

    # --- playlist metrics -----------------------------------------------------
    total_vol = sum(wave)
    late = sum(wave[70:])
    max_swing = max((q["mag"] for q in quakes), default=0.0)
    fav = max([("p1", opening[1]), ("draw", opening[2]), ("p2", opening[3])], key=lambda t: t[1])
    upset = round(fav[1], 1) if fav[0] != outcome and fav[1] > 55 else 0.0
    # lead changes: which side has max prob over time
    leader_series = []
    for _, p1, dr, p2 in [(0, *p[1:]) for p in prob]:
        leader_series.append(max([("p1", p1), ("draw", dr), ("p2", p2)], key=lambda t: t[1])[0])
    flips = sum(1 for a, b in zip(leader_series, leader_series[1:]) if a != b)

    p1n, p2n = fx["Participant1"], fx["Participant2"]
    name = {"p1": p1n, "p2": p2n, "draw": "the draw"}
    lines = []
    if upset:
        lines.append(f"The market gave {name[fav[0]]} a {round(fav[1])}% chance. Football disagreed.")
    if max_swing >= 15:
        q = max(quakes, key=lambda q: q["mag"])
        lines.append(f"{int(q['min'])}' — a {q['mag']}-point earthquake in {name[q['side']]}'s favour.")
    if flips >= 4:
        lines.append(f"The market changed its mind {flips} times. Nobody knew anything.")
    if total_vol < 60:
        lines.append("The flattest of waveforms. The market yawned for 90 minutes.")
    if not lines:
        lines.append(f"{name[outcome]} controlled the story from kickoff to whistle.")

    return {
        "id": fid,
        "p1": p1n, "p2": p2n,
        "p1Id": fx["Participant1Id"], "p2Id": fx["Participant2Id"],
        "kickoff": start,
        "stage": stage_for(start),
        "score": final_score,
        "outcome": outcome,
        "scoresReal": have_scores,
        "opening": [round(opening[1], 1), round(opening[2], 1), round(opening[3], 1)],
        "closing": [round(c1, 1), round(cd, 1), round(c2, 1)],
        "wave": [round(w, 2) for w in wave],
        "prob": prob,
        "quakes": quakes,
        "goals": goals,
        "cards": cards,
        "metrics": {
            "volatility": round(total_vol, 1),
            "lateDrama": round(late, 1),
            "maxSwing": round(max_swing, 1),
            "upset": upset,
            "flips": flips,
        },
        "lines": lines,
    }


def main():
    with open(os.path.join(ARCHIVE, "fixtures.json")) as f:
        fixtures = json.load(f)
    tracks = []
    skipped = []
    for fx in sorted(fixtures, key=lambda f: f["StartTime"]):
        if not os.path.isdir(os.path.join(ARCHIVE, str(fx["FixtureId"]))):
            continue
        t = compute_track(fx)
        if t:
            tracks.append(t)
        else:
            skipped.append(f"{fx['FixtureId']} {fx['Participant1']} v {fx['Participant2']}")
    with open(OUT, "w") as f:
        json.dump(tracks, f)
    print(f"tracks written: {len(tracks)} -> {OUT} ({os.path.getsize(OUT)//1024} KB)")
    print(f"with real scores: {sum(1 for t in tracks if t['scoresReal'])}")
    print("skipped (no data):", *skipped, sep="\n  ")
    top = sorted(tracks, key=lambda t: -t["metrics"]["volatility"])[:5]
    print("\nTop bangers:")
    for t in top:
        print(f"  {t['p1']} {t['score']} {t['p2']} — vol {t['metrics']['volatility']}, stage {t['stage']}")


if __name__ == "__main__":
    main()
