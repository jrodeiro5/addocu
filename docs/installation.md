# Installation Guide 📥

This guide provides detailed instructions for installing Addocu in your Google Workspace environment.

## 🎯 Method 1: Google Workspace Marketplace (Recommended)

### Step 1: Access the Marketplace
1. Open **Google Sheets** in your browser
2. Click on **Extensions** in the menu bar
3. Select **Add-ons** → **Get add-ons**
4. Search for **"Addocu"** in the marketplace

### Step 2: Install the Add-on
1. Click on **Addocu** from the search results
2. Click **"Install"** button
3. **Review permissions** carefully:
   - Access to Google Sheets (to create audit sheets)
   - Access to Google Analytics Admin API
   - Access to Google Tag Manager API
   - Access to Looker Studio API
4. Click **"Allow"** to grant permissions

### Step 3: Verify Installation
1. Open a **new Google Sheet**
2. Check if **"Addocu"** appears in the **Extensions** menu
3. If visible, installation was successful!

## 🔧 Method 2: Manual Installation (Advanced Users)

### Prerequisites
- **Google Apps Script** experience
- **Google Cloud Console** access
- **Google Workspace** admin permissions (for organization-wide deployment)

### Step 1: Download Source Code
```bash
# Clone the repository
git clone https://github.com/yourusername/addocu.git
cd addocu
```

### Step 2: Set Up Google Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Click **"New Project"**
3. Rename the project to **"Addocu"**
4. Delete the default `Code.gs` file

### Step 3: Import Source Files
Copy the following files from the repository:

**JavaScript Files (.gs):**
- `coordinador.js` → Rename to `Coordinador.gs`
- `utilidades.js` → Rename to `Utilidades.gs`
- `ga4.js` → Rename to `SincronizadorGA4.gs`
- `gtm.js` → Rename to `SincronizadorGTM.gs`
- `looker_studio.js` → Rename to `SincronizadorLooker.gs`
- `logging.js` → Rename to `Logging.gs`
- `dashboard.js` → Rename to `Dashboard.gs`

**HTML Files:**
- `configuracion.html` → Create as HTML file
- `dashboard.html` → Create as HTML file

**Manifest:**
- Copy `appsscript.json` content to your project manifest

### Step 4: Configure the Manifest
1. Click the **gear icon** (Project Settings) in Apps Script
2. Check **"Show appsscript.json manifest file"**
3. Replace the content with the provided `appsscript.json`

### Step 5: Deploy as Add-on
1. Click **"Deploy"** → **"New Deployment"**
2. Choose **"Add-on"** as the type
3. Fill in the configuration:
   - **Add-on name:** Addocu
   - **Description:** Audit and Document Your Google Marketing Stack
   - **Post-install tip:** Configure your API key in Extensions > Addocu > Configure

### Step 6: Test the Installation
1. Open a **new Google Sheet**
2. Refresh the page
3. Check **Extensions** menu for **Addocu**

## 🔐 API Configuration

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"**
3. Enter project name: **"Addocu API Project"**
4. Click **"Create"**

### Step 2: Enable Required APIs
Enable these APIs in your Google Cloud Console:

```
Google Analytics Admin API (analyticsadmin.googleapis.com)
Google Tag Manager API (tagmanager.googleapis.com)
Looker Studio API (datastudio.googleapis.com)
```

**How to enable:**
1. Go to **"APIs & Services"** → **"Library"**
2. Search for each API name
3. Click **"Enable"** for each one

### Step 3: Create API Key
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"API Key"**
3. **Copy the API key** - you'll need this for Addocu configuration
4. **(Recommended)** Click **"Restrict Key"** and limit to the specific APIs

### Step 4: Configure Billing (Required)
⚠️ **Important:** While billing must be enabled, Addocu usage falls within Google's free tier.

1. Go to **"Billing"** in Google Cloud Console
2. **Link a billing account** (credit card required)
3. **Set up budget alerts** for peace of mind (recommended: $5 monthly alert)

## ✅ Verification & Testing

### Test API Connection
1. Open **Google Sheets**
2. Go to **Extensions** → **Addocu** → **⚙️ Configure**
3. Enter your **API Key**
4. Click **"Test Connection"**
5. Verify all APIs show **"Connected"** status

### Run First Audit
1. Go to **Extensions** → **Addocu** → **🔄 Sync All Platforms**
2. Wait for the process to complete
3. Check for new sheets:
   - `DASHBOARD`
   - `GA4_PROPERTIES`
   - `GTM_TAGS`
   - `LOOKER_STUDIO`
   - `LOGS`

## 🚨 Troubleshooting Installation

### Common Issues

#### "Add-on not visible in Extensions menu"
- **Solution:** Refresh the Google Sheet page
- **Alternative:** Close and reopen the sheet

#### "Permission denied" errors
- **Solution:** Ensure all required APIs are enabled
- **Check:** Your Google account has access to GA4, GTM, and Looker Studio

#### "API key invalid" error
- **Solution:** Verify the API key is correctly copied
- **Check:** API key restrictions don't block the required APIs

#### "Quota exceeded" warnings
- **Solution:** Wait a few minutes and try again
- **Prevention:** Avoid running multiple large audits simultaneously

### Getting Help
- **Check:** [Troubleshooting Guide](troubleshooting.md)
- **GitHub Issues:** [Report installation problems](https://github.com/jrodeiro5/addocu/issues)
- **Email:** hola@addocu.com

## 🏢 Organization-Wide Deployment

### For Google Workspace Admins

#### Step 1: Admin Console Configuration
1. Go to [Google Admin Console](https://admin.google.com)
2. Navigate to **Apps** → **Google Workspace Marketplace apps**
3. Search and install **Addocu**
4. Configure **organizational units** as needed

#### Step 2: User Communication
Provide users with:
- **Installation confirmation** that Addocu is available
- **API key setup instructions** (each user needs their own)
- **Basic usage guide** and training resources
- **Support contact** information

#### Step 3: Security Review
- **Review permissions** granted to the add-on
- **Monitor usage** through admin reports
- **Set up alerts** for unusual API activity

## 🔄 Updates and Maintenance

### Automatic Updates
- **Marketplace installations** update automatically
- **Manual installations** require manual updates

### Checking for Updates
1. Check the [GitHub repository](https://github.com/yourusername/addocu) for new releases
2. Review the [CHANGELOG.md](../CHANGELOG.md) for new features
3. Update your manual installation if needed

### Backup Considerations
- **User configurations** are stored in Google Apps Script properties
- **Audit data** is stored in user's Google Sheets
- **No external backup** needed - everything stays in Google Workspace

---

**Next Step:** [Configuration Guide](configuration.md) to set up your API key and start auditing.
