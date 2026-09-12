# 🚀 Team-Safe Git Workflow

This repository follows a strict **Rebase-First** workflow to ensure a clean, linear history without merge commits or broken builds.

---

## 🔁 Standard Development Flow

### 1. Sync Your Environment
Always start from the latest state of the project.
```bash
git checkout develop
git pull origin develop
run: npm install
2. Create Feature Branch
Use a descriptive name for your task.

Bash
git checkout -b feature/your-feature-name
3. Work & Commit
Keep your commits small, focused, and descriptive.

Bash
git add .
git commit -m "feat: add specific functionality"
4. Sync Before Push (Crucial) 🛡️
Before pushing, incorporate any changes made by the team while you were working. This prevents merge conflicts in the PR.

Bash
git fetch origin
git rebase origin/develop
Note: If there are conflicts, resolve them locally during the rebase process and use git rebase --continue.

5. Push & Pull Request
Push your branch and open a PR against develop.

Bash
git push -u origin feature/your-feature-name
🔒 The Golden Rules
❌ NEVER
Force push (--force) on main or develop.

Use git-filter-repo without team-wide coordination.

Commit large raw images or binaries (use LFS instead).

Commit .env files, API keys, or secrets.

✅ ALWAYS
Use feature branches for all changes.

Rebase before pushing to maintain a linear history.

Keep commits atomic (one logical change per commit).

Pull the latest develop before starting any new work.

🛡️ Branch Protection (GitHub)
To maintain stability, the following settings are enforced on main and develop:

Require Pull Request before merging.

Require status checks (CI/CD / Linting) to pass.

Prevent force pushes and deletions.

⚡ Large Asset Management (Git LFS)
If the project scales with heavy assets, use Git LFS to prevent repository bloat:

Bash
# Initialize LFS
git lfs install

# Track specific file types
git lfs track "*.jpg"
git lfs track "*.png"

# Commit the tracking configuration
git add .gitattributes
git commit -m "chore: setup git lfs for images"
✅ Results
Clean History: No "Merge branch..." commits.

No Repo Bloat: Large files handled via LFS.

Minimal Conflicts: Rebasing catches issues before they hit the server.

Stability: Branch protections ensure only tested code is merged.
