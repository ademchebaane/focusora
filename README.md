# Focusora — study together, reach goals together ✦

Focusora is a mobile-first study timer and friend-group app with a warm lilac, coral, and sage design. It includes a focus timer, personal goals, shared group goals, invite codes, friends, tasks, session history, insights, theme choices, and an Android APK build workflow.

## The files are intentionally flat

Put these files directly in the root of your GitHub repository:

- `index.html`
- `app.css`
- `app.js`
- `package.json`
- `capacitor.config.json`
- `supabase.sql`
- `README.md`
- `.gitignore`

The only required nested source-control path is `.github/workflows/build-apk.yml`. GitHub Actions needs that exact folder structure to discover the build workflow. The generated `www/` and `android/` folders are created automatically during the build; you do not need to upload them.

## 1. Build the APK with GitHub

1. Create a new repository on GitHub.
2. Upload the flat files to the repository root. To add the required workflow in GitHub’s website, choose **Add file → Create new file**, enter `.github/workflows/build-apk.yml` as the filename (GitHub creates the folders), paste the workflow file contents, and commit it. GitHub Desktop can also commit the extracted folder structure in one step.
3. Commit the files to the `main` or `master` branch.
4. Open the repository's **Actions** tab and select **Build Focusora APK**.
5. When the run finishes successfully, open that workflow run and download the `focusora-android-apk` artifact.
6. Extract the artifact ZIP to get `app-debug.apk`, then transfer it to your Android phone and install it. Android may ask you to allow installation from the file manager/browser you used.

The workflow also runs manually: **Actions → Build Focusora APK → Run workflow**. Every new commit to `main`/`master` builds a fresh APK artifact. To publish a longer-lived download page in **GitHub Releases**, create and push a version tag such as `v1.0.0`; the workflow will attach the APK to that release.

The APK made by this workflow is a **debug APK for testing**, not a Play Store release. Keep a signing key private if you later make a signed release build.

## 2. Try the app before configuring the cloud

Open `index.html` in a browser or use the APK after the workflow builds it. Demo mode works without a Supabase account and saves demo changes in the current browser/app storage. The sample groups and friends are examples, not real online users.

## 3. Set up online accounts and shared groups

The app's online mode uses Supabase (free tier availability and limits can change). A Supabase project is required for real accounts and for friends/groups to share the same data across devices.

1. Create a project at [supabase.com](https://supabase.com/).
2. In the Supabase project, open **SQL Editor → New query**.
3. Paste all the contents of `supabase.sql` and run it once. It creates the profile, friend, group, goal, task, and study-session tables plus Row Level Security policies.
4. Open the project's **Connect** or **API Keys** area. Copy the Project URL and the **publishable key** (or legacy `anon` key).
5. In Focusora, open **Settings & cloud**. Paste those two values into the Supabase fields and press **Save & connect**.
6. Create an account, then sign in. For new accounts, if Supabase email confirmation is enabled, confirm the email before signing in.
7. Ask your friends to install the same app, connect to the same Supabase project, create their own accounts, and exchange usernames or group invite codes.

**Never paste a `service_role` key into the app.** Only use the publishable/anon key; database Row Level Security is what protects each account's data. The SQL in this repo enables RLS and includes policies for the tables used by the app.

If Supabase asks you to enable Data API access for these tables, enable access for the tables in this app. Keep RLS enabled.

## 4. Online feature notes

- Creating a group writes the group, membership, and first shared target to Supabase.
- Joining with a code uses the `join_group_by_code` database function so private groups do not need to be publicly listed.
- Starting a timer creates an active session; stopping it saves its completed duration.
- Group goal progress sums completed sessions connected to that group after the goal was created.
- Personal goal progress counts completed solo sessions explicitly linked to that goal.
- Friend requests use usernames; both people need cloud accounts for real cross-device requests.
- The app does not write a database row every second. The timer ticks on the device and saves session changes when appropriate.

The current version is a practical first release. Realtime infrastructure for study-session rows is enabled in the SQL when the Supabase `supabase_realtime` publication exists; UI refreshes also happen when the app reloads or the cloud refresh button is pressed.

## 5. Change the app

Edit `index.html`, `app.css`, and `app.js` directly in the repository root. Commit and push your changes; GitHub Actions rebuilds the APK automatically. Do not edit files inside generated `android/` or `www/` folders because the workflow recreates them from the root files on every build.

## 6. Test locally (optional)

Use Node.js 22 or newer. From the repository root:

```bash
npm install
npm run check
npm run prepare:web
npx cap add android
npx cap sync android
```

To build locally you also need Android Studio and an Android SDK. The GitHub Actions workflow handles those pieces in the cloud for the APK artifact.
