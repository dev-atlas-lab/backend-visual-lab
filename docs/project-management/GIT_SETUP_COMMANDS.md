# Step 1: Initialize local git repository (if not already initialized)
cd /home/anhltn/projects/backend-visual-lab
git init -b main

# Step 2: Add all scaffolded files and create initial commit
git add .
git commit -m "feat: initial scaffold for Backend Visual Lab (Antigravity Edition)"

# Step 3: Create GitHub repository under the dev-atlas-lab organization
# (Run via GitHub Web UI at https://github.com/organizations/dev-atlas-lab/repositories/new OR using gh if installed)
# Repository name: backend-visual-lab

# Step 4: Link remote origin
git remote add origin https://github.com/dev-atlas-lab/backend-visual-lab.git

# Step 5: Push initial commit to main
git push -u origin main

# Step 6: Create feature branch for PR
git checkout -b feature/scaffold-mvp-foundations
# (Any follow-up additions can be committed here)
git push -u origin feature/scaffold-mvp-foundations

# Step 7: Create Pull Request to main branch via GitHub Web:
# https://github.com/dev-atlas-lab/backend-visual-lab/compare/main...feature/scaffold-mvp-foundations
