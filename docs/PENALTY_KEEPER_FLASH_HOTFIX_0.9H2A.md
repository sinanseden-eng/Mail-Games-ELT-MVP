# 0.9H2A — Keeper POV Flash Hotfix

## Problem

The goalkeeper replay still displayed a brief white/cartoon-style flash before the realistic goal camera appeared.

## Cause

The keeper camera retained the generic `impactOpacity` transition, while the shared fallback renderer still contained radial ball-camera and contact-burst effects.

## Fix

- Removed the full-screen white overlay from `drawKeeperPovWorld()`.
- Set keeper `ballCamOpacity` and `impactOpacity` to zero.
- Disabled legacy kick/impact bursts when `viewerRole === "keeper"`.
- Shortened the goal cut from 55 ms after contact to 18 ms after contact.
- Kept the actual ball, gloves, camera dive and realistic final impact as the only storytellers.

## Data and deployment

No Supabase migration, Netlify variable, email-flow change or match-engine change is required.
