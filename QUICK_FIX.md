# 🚨 QUICK FIX: CASA Endpoints Not Working

The registration endpoints aren't showing up because WordPress needs to be told about them. Here are 3 ways to fix this:

## Method 1: WordPress Admin (Easiest)

1. **Go to WordPress Admin**: http://casa-backend.local/wp-admin/
2. **Login with your WordPress admin credentials**
3. **Go to**: Plugins → Installed Plugins  
4. **Find "CASA Enhanced User Management"**
5. **Click "Deactivate"** then **"Activate"**
6. **Go to**: Settings → Permalinks
7. **Click "Save Changes"** (this flushes rewrite rules)

## Method 2: Direct Plugin Check

The plugin file should be at:
```
/wp-content/plugins/casa-enhanced/casa-enhanced.php
```

**Check if this file exists** in your WordPress installation. If not, the plugin files need to be copied to the correct location.

## Method 3: Manual Plugin Copy

If the plugin isn't in the right place, copy it:

1. **Find your WordPress plugins directory** (usually `/path/to/wordpress/wp-content/plugins/`)
2. **Copy the entire casa-enhanced folder** from our project to there
3. **Activate the plugin** in WordPress admin

## Method 4: Use Existing Endpoints

Your CASA API already has these working endpoints:

- `POST /wp-json/casa/v1/users` - Create users
- `POST /wp-json/casa/v1/organizations` - Create organizations  
- `GET /wp-json/casa/v1/organizations` - List organizations

You could modify your frontend to use these existing endpoints instead.

## Test If It's Working

After trying any method above, test by visiting:
http://casa-backend.local/wp-json/casa/v1/

Look for:
- `/casa/v1/register-organization` 
- `/casa/v1/register-volunteer`

If you see these in the routes list, the fix worked!

## Alternative: Use Local by Flywheel

If you're using Local by Flywheel:

1. **Open Local app**
2. **Right-click your site** → "Open site shell"
3. **Run**: `wp plugin activate casa-enhanced`
4. **Run**: `wp rewrite flush`

---

**The functionality is all built - it just needs WordPress to recognize the new endpoints!**