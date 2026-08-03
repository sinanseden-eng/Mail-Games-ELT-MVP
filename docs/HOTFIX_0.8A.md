# Mail Games ELT 0.8a — Turkey arena rendering hotfix

This hotfix addresses a deployed Turkey Fight screen where the email flow, move resolution and result panel worked, but the farm arena remained a flat blue rectangle.

Changes:

- pins the Turkey canvas to the scene with absolute sizing;
- explicitly reveals the Turkey canvas when the game type changes;
- redraws after the canvas enters layout;
- adds a Canvas `roundRect` compatibility path;
- catches rendering failures without breaking turn submission;
- keeps a lightweight farm-and-fighters fallback behind the canvas until a successful frame is painted.

No database migration or environment-variable change is required.
