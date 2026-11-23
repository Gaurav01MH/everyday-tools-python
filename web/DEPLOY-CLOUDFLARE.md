# Free Cloudflare Pages deployment for Files Format

## Requested free hostname

Project name: too-broke-for-a-custom-domain
Target URL: https://too-broke-for-a-custom-domain.pages.dev/

This is a free Cloudflare Pages subdomain, not a purchased custom domain. The name must be available when you create the project. Cloudflare uses the project name to generate the hostname and does not let you simply rename a pages.dev hostname after creation, so confirm the spelling before saving.

## 1. Create the Pages project

1. Open https://dash.cloudflare.com/ and sign in.
2. Go to Workers & Pages → Create application → Pages → Connect to Git.
3. Connect GitHub and select Gaurav01MH/everyday-tools-python.
4. Set the project name to exactly: too-broke-for-a-custom-domain.
5. Set production branch to main.
6. Set root directory to web.
7. Set build command to: npm install --no-audit --no-fund && npm run build
8. Set build output directory to: dist
9. Add production build variables:
   - PUBLIC_BASE_PATH = /
   - PUBLIC_SITE_ORIGIN = https://too-broke-for-a-custom-domain.pages.dev
   - VITE_SHARE_API_ENABLED = true
   - VITE_TURNSTILE_SITE_KEY = the public site key from your Turnstile widget
10. Save and deploy.

## 2. Create the R2 bucket

1. Open R2 Object Storage in the Cloudflare dashboard.
2. Create a Standard bucket named files-format-shares.
3. The repository's web/wrangler.jsonc declares an R2 binding called SHARES for that bucket. After deployment, check Pages → Settings → Bindings and confirm that SHARES is connected to files-format-shares. If it is missing, add an R2 bucket binding there and redeploy.

## 3. Configure Turnstile

1. Create a Turnstile widget.
2. Add too-broke-for-a-custom-domain.pages.dev as an allowed hostname.
3. The app sends the action name share-upload.
4. Set the widget's public site key in the build variable VITE_TURNSTILE_SITE_KEY.
5. Add the private secret as a Pages Function secret named TURNSTILE_SECRET_KEY. Do not prefix the secret with VITE_.
6. Redeploy after setting both keys.

The browser obtains a one-use token; the Pages Function validates it with Cloudflare Siteverify before storing anything. The secret is never bundled into the website.

## 4. Set automatic seven-day cleanup

In R2, open the files-format-shares bucket → Settings → Object Lifecycle Rules → Add rule. Create an enabled rule:

- Name: delete-shared-files-after-seven-days
- Prefix: shared/
- Expiration: delete objects after 7 days

The download function also checks the expiry timestamp and refuses the download with HTTP 410 after the exact seven-day expiry, even if the lifecycle process has not yet deleted the object. R2 lifecycle deletion normally completes within 24 hours after the expiry time.

## 5. Test

Open the Pages URL. Choose Text & data → Link Tool, paste a short test message, complete the security check and create a share URL. Open it in a private window to confirm the file downloads. Then choose QR Tool, upload a small test file, create the QR and scan it to verify that it opens the matching share URL.

## Storage and privacy limits

- One file or pasted text per share.
- 10 MB maximum for each upload.
- Maximum 300 active share objects and 3 GB of active share content as a conservative in-app allowance.
- Every link expires after seven days. The download route checks expiry and the R2 lifecycle rule performs physical cleanup.
- Anyone with the URL can download the content. Treat links like passwords; do not upload confidential, personal, financial, medical or sensitive content.
- Turnstile is required for every upload.
- R2 Free currently includes 10 GB-month Standard storage, 1 million Class A requests, 10 million Class B requests and free internet egress. Usage beyond free allowances may be billed; monitor your R2 usage.

Cloudflare docs: Pages Git integration https://developers.cloudflare.com/pages/get-started/git-integration/ ; Pages R2 bindings https://developers.cloudflare.com/pages/functions/bindings/ ; Turnstile verification https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ ; R2 lifecycle rules https://developers.cloudflare.com/r2/buckets/object-lifecycles/ ; R2 pricing https://developers.cloudflare.com/r2/pricing/