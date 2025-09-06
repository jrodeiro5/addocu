# Troubleshooting Guide 🔧

This guide helps you resolve common issues with Addocu installation, configuration, and usage.

## 🚨 Quick Issue Resolution

### Most Common Issues

| Issue | Quick Fix | Details |
|-------|-----------|---------|
| Add-on not visible | Refresh Google Sheets | [See below](#add-on-not-visible) |
| API connection fails | Check API enablement | [API Issues](#api-connection-issues) |
| Empty audit results | Verify permissions | [Permission Problems](#permission-issues) |
| Configuration won't save | Check popup blockers | [Configuration Issues](#configuration-problems) |
| Looker Studio auth error | Known issue - Fixed in v2.1+ | [Looker Studio Issues](#looker-studio-issues) |
| Dashboard generation fails | Known issue - Fixed in v2.1+ | [Dashboard Issues](#dashboard-generation-issues) |

## 🔍 Diagnostic Steps

### Step 1: Check Add-on Status
1. Open **Google Sheets**
2. Look for **Addocu** in **Extensions** menu
3. If not visible → [Add-on Installation Issues](#add-on-installation-issues)

### Step 2: Test API Connection
1. Go to **Extensions** → **Addocu** → **⚙️ Configure**
2. Click **"Test API Connection"**
3. Note which APIs fail → [API Connection Issues](#api-connection-issues)

### Step 3: Check Logs
1. Go to **Extensions** → **Addocu** → **📋 View Logs**
2. Look for error messages → [Understanding Logs](#understanding-logs)

## 🔧 Installation Issues

### Add-on Not Visible

#### Symptoms
- Addocu doesn't appear in Extensions menu
- Menu appears empty or incomplete

#### Solutions

**Solution 1: Refresh and Retry**
```
1. Refresh the Google Sheets page (Ctrl+F5 or Cmd+R)
2. Wait 30 seconds for extensions to load
3. Check Extensions menu again
```

**Solution 2: Clear Browser Cache**
```
1. Clear browser cache and cookies for Google domains
2. Close all Google Sheets tabs
3. Reopen Google Sheets and check Extensions menu
```

**Solution 3: Try Different Browser**
```
1. Test in Chrome Incognito mode
2. Try Firefox or Edge
3. Disable browser extensions temporarily
```

**Solution 4: Reinstall Add-on**
```
1. Go to Google Workspace Marketplace
2. Find Addocu and click "Remove"
3. Wait 5 minutes
4. Reinstall from marketplace
```

### Installation Permission Errors

#### Symptoms
- "Permission denied" during installation
- OAuth consent screen errors

#### Solutions

**Check Organization Policies:**
```
1. Contact your Google Workspace admin
2. Verify third-party apps are allowed
3. Check if Addocu is specifically blocked
```

**Review Required Permissions:**
- Access to Google Sheets (to create audit data)
- External API access (for GA4, GTM, Looker Studio)
- User properties storage (for configuration)

## 🔑 API Connection Issues

### API Key Problems

#### "Invalid API Key" Error

**Causes and Solutions:**

**Wrong Key Format:**
```
❌ Wrong: API_KEY_WITH_EXTRA_SPACES
✅ Correct: AIzaSyDaGmWKa4JsXMe-EQfdGbr2X7dSxGVkrU4
```

**API Not Enabled:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Library**
3. Search and enable:
   - Google Analytics Admin API
   - Google Tag Manager API
   - Looker Studio API

**Key Restrictions Too Strict:**
1. Go to **APIs & Services** → **Credentials**
2. Click on your API key
3. Under **API restrictions**, verify these APIs are allowed:
   - Google Analytics Admin API
   - Google Tag Manager API
   - Looker Studio API

### Quota and Rate Limit Issues

#### "Quota exceeded" Errors

**Daily Quota Exceeded:**
```
Error: "Quota exceeded for quota metric 'Requests' and limit 'Requests per day'"
```

**Solutions:**
1. **Wait until next day** for quota reset
2. **Check quota usage** in Google Cloud Console
3. **Request quota increase** if needed (usually not necessary)

**Rate Limit Exceeded:**
```
Error: "Rate limit exceeded. Please retry after some time."
```

**Solutions:**
1. **Wait 1-2 minutes** and retry
2. **Avoid running multiple audits simultaneously**
3. **Contact support** if problem persists

### Billing Issues

#### "Billing not enabled" Error

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Billing**
3. **Enable billing** (credit card required)
4. **Set up budget alerts** (recommended: $5/month)

**Note:** Addocu usage typically stays within Google's free tier, but billing must be enabled for API access.

## 🐛 Known Issues & Fixes

### Looker Studio Issues

#### "Servicio no soportado: lookerStudio" Error

**Symptoms:**
```
ERROR AUTH Error en autenticación para lookerStudio: Servicio no soportado: lookerStudio
```

**Status:** ✅ FIXED in version 2.1+

**Cause:** Service name inconsistency between modules

**Solution for Older Versions:**
Update to version 2.1+ or apply manual fix:

1. **Contact maintainer** for immediate support
2. **Temporary workaround:** Use individual service audits instead of "Stack Completo"
3. **Permanent fix:** Update to latest version

**Technical Details:**
- Fixed in commit: `ad65c35`
- Files affected: `utilidades.js`, configuration service recognition
- Backwards compatibility: Maintained

### Dashboard Generation Issues

#### "The number of columns in the data does not match" Error

**Symptoms:**
```
ERROR DASHBOARD Error generando dashboard ejecutivo: The number of columns in the data does not match the number of columns in the range. The data has 1 but the range has 2.
```

**Status:** ✅ FIXED in version 2.1+

**Cause:** Array dimension mismatch in dashboard header creation

**Solution for Older Versions:**
1. **Skip dashboard generation** - use individual sheets instead
2. **Update to version 2.1+** for permanent fix
3. **Manual workaround:** Delete DASHBOARD sheet before running audits

**Technical Details:**
- Fixed in commit: `ad65c35`
- Files affected: `coordinador.js`, dashboard generation logic
- Visual formatting: Preserved and improved

### Version Compatibility

#### How to Check Your Version
1. Open **Extensions** → **Addocu**
2. Look for version number in menu or configuration
3. Compare with [latest release](https://github.com/jrodeiro5/addocu/releases)

#### Upgrading to Latest Version
1. **Marketplace users:** Updates are automatic
2. **Manual installation:** Download latest from GitHub
3. **Development version:** Pull latest changes and redeploy

## 🔐 Permission Issues

### Platform Access Problems

#### Google Analytics 4

**"No properties found" Error:**

**Causes:**
- No GA4 access on your Google account
- All GA4 properties are Universal Analytics (deprecated)
- Insufficient permissions

**Solutions:**
1. **Verify GA4 access:** Go to [analytics.google.com](https://analytics.google.com)
2. **Check permissions:** Ensure you have "Viewer" or higher access
3. **Contact admin:** Request access to GA4 properties

#### Google Tag Manager

**"No containers found" Error:**

**Causes:**
- No GTM access on your Google account
- All containers are archived or deleted
- Insufficient permissions

**Solutions:**
1. **Verify GTM access:** Go to [tagmanager.google.com](https://tagmanager.google.com)
2. **Check permissions:** Ensure you have "View" or higher access
3. **Contact admin:** Request access to GTM containers

#### Looker Studio

**"No reports found" Error:**

**Causes:**
- No Looker Studio access
- No shared reports
- Reports are private

**Solutions:**
1. **Verify access:** Go to [datastudio.google.com](https://datastudio.google.com)
2. **Check shared reports:** Look for reports shared with you
3. **Create test report:** Create a simple report to test access

## ⚙️ Configuration Problems

### Sidebar Issues

#### Configuration Sidebar Won't Open

**Symptoms:**
- Clicking "Configure" does nothing
- Sidebar appears blank
- JavaScript errors in browser console

**Solutions:**

**Check Popup Blockers:**
```
1. Look for popup blocker notification in browser
2. Allow popups for Google Sheets domains
3. Refresh page and try again
```

**Browser Compatibility:**
```
1. Try Google Chrome (recommended browser)
2. Update browser to latest version
3. Disable conflicting browser extensions
```

**Clear Browser Data:**
```
1. Clear cache for Google domains
2. Clear cookies for accounts.google.com
3. Restart browser
```

### Configuration Won't Save

#### "Failed to save configuration" Error

**Causes:**
- Google Apps Script service interruption
- Browser blocking user properties storage
- Network connectivity issues

**Solutions:**
1. **Check Google Apps Script status:** [Google Workspace Status](https://www.google.com/appsstatus)
2. **Try different network:** Switch to mobile hotspot
3. **Wait and retry:** Service interruptions are usually brief

## 📊 Audit and Data Issues

### Empty or Incomplete Results

#### Audit Completes But No Data

**Diagnostic Steps:**
1. **Check the LOGS sheet** for error messages
2. **Verify platform access** manually
3. **Test with smaller scope** (single platform)

**Common Causes:**
- **Insufficient permissions** on platforms
- **Empty platforms** (no GA4 properties, GTM containers, etc.)
- **API restrictions** blocking data access

#### Partial Data Only

**Symptoms:**
- Some platforms work, others don't
- Missing custom dimensions, metrics, or other details

**Solutions:**
1. **Check individual API status** in configuration test
2. **Verify specific permissions** for missing data types
3. **Run platform-specific sync** to isolate issues

### Data Formatting Issues

#### Dates or Numbers Display Incorrectly

**Solutions:**
1. **Check sheet locale settings** in Google Sheets
2. **Format columns manually** if needed
3. **Report formatting issues** on GitHub

#### Special Characters or Encoding

**Solutions:**
1. **Check source data** in GA4/GTM/Looker Studio
2. **Report encoding issues** with specific examples
3. **Use CSV export** as workaround

## 📋 Understanding Logs

### Log Sheet Structure

The **LOGS** sheet contains detailed information about each operation:

| Column | Description |
|--------|-------------|
| Timestamp | When the operation occurred |
| Level | INFO, WARNING, ERROR |
| Operation | Which function was running |
| Message | Human-readable description |
| Details | Technical details (JSON) |

### Common Log Messages

#### Success Messages
```
INFO | sincronizarGA4 | GA4 sync completed successfully | {properties: 3, customDimensions: 15}
INFO | sincronizarGTM | GTM sync completed | {containers: 2, tags: 45, triggers: 12}
```

#### Warning Messages
```
WARNING | sincronizarLooker | Some reports inaccessible | {accessible: 10, restricted: 3}
WARNING | validateAPIKey | Approaching quota limit | {remaining: 150, limit: 1000}
```

#### Error Messages
```
ERROR | sincronizarGA4 | API call failed | {error: "Access denied", endpoint: "/accounts"}
ERROR | configuracion | Invalid API key format | {key: "invalid_key_format"}
```

### Using Logs for Troubleshooting

1. **Find the error:** Look for ERROR level entries
2. **Check timing:** When did the error occur?
3. **Read details:** The Details column often contains the full error
4. **Cross-reference:** Match errors with your actions

## 🆘 Getting Help

### Self-Service Resources

#### Documentation
- **Installation Guide:** [docs/installation.md](installation.md)
- **Configuration Guide:** [docs/configuration.md](configuration.md)
- **GitHub Issues:** [Search existing issues](https://github.com/jrodeiro5/addocu/issues)

#### Testing Tools
- **Google Cloud Console:** Check API usage and errors
- **Google Apps Script Editor:** View execution logs
- **Browser Developer Tools:** Check for JavaScript errors

### Community Support

#### GitHub Issues
**Before creating a new issue:**
1. **Search existing issues** for similar problems
2. **Check if it's already fixed** in a newer version
3. **Gather diagnostic information** listed below

**When creating an issue, include:**
- **Addocu version** (check in add-on menu)
- **Browser and version** (Chrome 91, Firefox 89, etc.)
- **Error messages** from LOGS sheet
- **Steps to reproduce** the problem
- **Expected vs actual behavior**

#### Email Support
**Contact:** hola@addocu.com

**For email support, include:**
- **Subject line:** "Addocu Support - [Brief description]"
- **Diagnostic information** from GitHub issue template
- **Screenshots** of error messages or unexpected behavior
- **Configuration details** (without API key)

### Enterprise Support

For organizations requiring dedicated support:
- **Priority response** for critical issues
- **Direct access** to development team
- **Custom configuration** assistance
- **Training and onboarding** support

Contact hola@addocu.com for enterprise support options.

## 🔄 Advanced Troubleshooting

### Manual API Testing

#### Test APIs Directly
```bash
# Replace YOUR_API_KEY with your actual key

# Test GA4 API
curl "https://analyticsadmin.googleapis.com/v1beta/accounts?key=YOUR_API_KEY"

# Test GTM API
curl "https://tagmanager.googleapis.com/tagmanager/v2/accounts?key=YOUR_API_KEY"

# Test Looker Studio API
curl "https://datastudio.googleapis.com/v1/reports?key=YOUR_API_KEY"
```

#### Expected Responses
- **Success:** JSON response with data
- **Auth Error:** 403 Forbidden
- **Invalid Key:** 400 Bad Request
- **Quota Error:** 429 Too Many Requests

### Debug Mode

#### Enable Detailed Logging
1. Open Google Apps Script editor
2. Find the `Logging.gs` file
3. Change `DEBUG_MODE = false` to `DEBUG_MODE = true`
4. Save and run audit again

#### Interpreting Debug Output
- **API calls:** Full request/response details
- **Data processing:** Step-by-step transformation
- **Error context:** Complete error stack traces

### Recovery Procedures

#### Reset Configuration
```javascript
// Run in Apps Script editor to reset configuration
function resetConfiguration() {
  PropertiesService.getUserProperties().deleteAll();
  console.log('Configuration reset complete');
}
```

#### Clear All Data
```javascript
// Run to clear all Addocu data from current sheet
function clearAddocuData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ['DASHBOARD', 'GA4_PROPERTIES', 'GTM_TAGS', 'LOOKER_STUDIO', 'LOGS'];
  
  sheets.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      ss.deleteSheet(sheet);
    }
  });
  
  console.log('All Addocu data cleared');
}
```

---

**Still having issues?** Please [create an issue](https://github.com/jrodeiro5/addocu/issues) with detailed information about your problem.
