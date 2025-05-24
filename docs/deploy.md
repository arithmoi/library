# Deploying to GitHub Pages

This guide explains how to deploy your Astro static site to GitHub Pages.

## Prerequisites

1.  **GitHub Account & Repository:** Ensure you have a GitHub account and that your project is a GitHub repository.
2.  **Astro Project Built:** Your Astro project should be ready to build.
3.  **Custom Domain (Optional):** If you plan to use a custom domain (e.g., `www.yourdomain.com`), have it registered and accessible.

## Deployment Steps

### 1. Configure `astro.config.mjs` (if needed for a subdirectory)

If your repository name is `your-username.github.io`, your site will be served from the root, and you likely don't need to change `site` or `base` in `astro.config.mjs` unless you have specific needs.

If you are deploying to a project site (e.g., `your-username.github.io/repository-name/`), you need to configure the `site` and `base` options in your `astro.config.mjs` file:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Replace with your GitHub Pages URL
  site: 'https://your-username.github.io',
  // Replace with your repository name
  base: '/repository-name',
  // ... other configurations
});
```
Replace `your-username` with your GitHub username and `repository-name` with your repository's name.

### 2. Build Your Astro Site

Run the build command to generate the static files for your site. These will be placed in the `dist/` directory by default.

```bash
npm run build
```

### 3. Push `dist` Directory to GitHub

There are several ways to deploy the `dist` folder to GitHub Pages:

*   **Using a `gh-pages` branch:** This is a common method. You can manually push the contents of `dist/` to a `gh-pages` branch or use a script/tool like `gh-pages` npm package.
*   **Using GitHub Actions:** This is the recommended and most robust method for automated deployments. You can set up a GitHub Action workflow to build and deploy your site automatically whenever you push to your main branch. Astro provides an official action for this.

#### Example: GitHub Action for Astro

Create a file named `.github/workflows/deploy.yml` in your project root:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main # Or your default branch

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout 🛰️
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18' # Or your preferred Node.js version

      - name: Install Dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Deploy 🚀
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          # cname: your.custom.domain.com # Uncomment if using a custom domain
```

### 4. Configure GitHub Pages in Repository Settings

1.  Go to your repository on GitHub.
2.  Click on **Settings**.
3.  In the left sidebar, click on **Pages**.
4.  Under "Build and deployment":
    *   For **Source**, select **Deploy from a branch**.
    *   For **Branch**, select the branch where your built site's code is (e.g., `gh-pages` if you pushed `dist` contents there, or `main` if your action deploys to `gh-pages` which is then set as the source). Select the `/ (root)` folder unless your built files are in a subfolder like `/docs` on that branch.
    *   If using GitHub Actions to deploy, the action typically handles creating the `gh-pages` branch and deploying to it. You would then select `gh-pages` and `/ (root)` here.

Wait a few minutes for GitHub Pages to build and deploy your site. You should see the URL where it's published.

## Using a Custom Domain

If you want to use a custom domain (e.g., `library.arithmoi.org`):

### 1. Add `CNAME` File (If not using GitHub Actions `cname` input)

If you are *not* using the `cname` input in the `peaceiris/actions-gh-pages` GitHub Action, create a file named `CNAME` (no extension) in your Astro project's `public/` directory. This file should contain only your custom domain.

Example `public/CNAME` content:
```
library.arithmoi.org
```
When you build your site, Astro will copy this `CNAME` file to the `dist/` directory. When deployed, GitHub Pages will use it to serve your site from the custom domain.

### 2. Configure DNS Records with Your DNS Provider

Go to your DNS provider's website (where you registered your domain) and configure the DNS records:

*   **For an apex domain (e.g., `arithmoi.org`):**
    Create `A` records pointing to the GitHub Pages IP addresses:
    *   `185.199.108.153`
    *   `185.199.109.153`
    *   `185.199.110.153`
    *   `185.199.111.153`

*   **For a subdomain (e.g., `library.arithmoi.org` or `www.arithmoi.org`):**
    Create a `CNAME` record pointing to `[your-username].github.io` (replace `[your-username]` with your GitHub username).
    Example: `CNAME library -> arithmoi.github.io.`

    *Note: Some DNS providers allow `ALIAS`, `ANAME`, or flattened `CNAME` records at the apex, which can point to `[your-username].github.io`. This is often preferred over `A` records if available, as GitHub's IPs can change (though rarely).*

### 3. Configure Custom Domain in GitHub Pages Settings

1.  Go to your repository's **Settings > Pages**.
2.  Under "Custom domain", enter your custom domain (e.g., `library.arithmoi.org`) and click **Save**.
3.  GitHub will attempt to verify your domain. This may take some time for DNS changes to propagate.
4.  Once verified, you can check the **Enforce HTTPS** option.

DNS changes can take up to 24-48 hours to propagate fully.

---

This guide provides a comprehensive overview. Refer to the official [Astro deployment documentation](https://docs.astro.build/en/guides/deploy/) and [GitHub Pages documentation](https://docs.github.com/en/pages) for more details and troubleshooting.
