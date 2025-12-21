# WordPress Enhanced CASA Integration Setup

## 🚀 **Complete WordPress User Integration**

This enhanced setup provides full WordPress user management with CASA-specific roles, permissions, and data storage.

---

## 📋 **Step 1: Install the Enhanced CASA Plugin**

### **Option A: Upload via WordPress Admin**

1. **Copy the plugin file**:
   - Copy `wordpress-backend/plugins/casa-enhanced/casa-enhanced.php` 
   - Or create the file directly in WordPress

2. **Install in WordPress**:
   ```
   /wp-content/plugins/casa-enhanced/casa-enhanced.php
   ```

3. **Activate the plugin**:
   - Go to WordPress Admin → Plugins
   - Find "CASA Enhanced User Management"
   - Click "Activate"

### **Option B: Local by Flywheel Setup**

1. **Navigate to your site files**:
   - Open Local by Flywheel
   - Click your `casa-backend` site
   - Click the folder icon to open site files

2. **Create the plugin**:
   ```
   app/public/wp-content/plugins/casa-enhanced/casa-enhanced.php
   ```

3. **Copy the plugin code** from `wordpress-backend/plugins/casa-enhanced/casa-enhanced.php`

4. **Activate in WordPress Admin**

---

## 🔧 **Step 2: Configure User Roles**

After activation, the plugin automatically creates:

### **CASA User Roles**
- **CASA Administrator**: Full system access
- **CASA Supervisor**: Case and volunteer management  
- **CASA Coordinator**: Limited case management
- **CASA Volunteer**: Basic case access

### **Update Your User Role**
1. **Go to**: WordPress Admin → Users → All Users
2. **Edit your user** (`wrjones`)
3. **Change role to**: "CASA Administrator" or "CASA Supervisor"
4. **Save changes**

---

## 🗄️ **Step 3: Database Tables Created**

The plugin automatically creates these tables:

### **`wp_casa_organizations`**
- CASA program/organization data
- Settings and configuration

### **`wp_casa_user_organizations`** 
- User-organization mapping
- CASA-specific user roles
- Background check status
- Training status

### **`wp_casa_cases`**
- Complete case management
- Child information
- Case assignments
- Court details

---

## 🧪 **Step 4: Test Enhanced Authentication**

### **Test the Enhanced Login Endpoint**
```bash
curl -X POST http://casa-backend.local/wp-json/casa/v1/auth/login \
-H 'Content-Type: application/json' \
-d '{
  "username": "wrjones",
  "password": "W4lt3rj0n3s@",
  "organization_slug": "demo-casa"
}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": 1,
      "email": "walterjonesjr@gmail.com",
      "firstName": "Walter",
      "lastName": "Jones",
      "roles": ["casa_administrator"],
      "casa_role": "supervisor",
      "organizationId": "1",
      "backgroundCheckStatus": "pending",
      "trainingStatus": "pending"
    },
    "organization": {
      "id": "1",
      "name": "Demo CASA Program",
      "slug": "demo-casa"
    }
  }
}
```

---

## 🎯 **Step 5: Frontend Integration**

The frontend is already updated to use the enhanced authentication! 

### **Login Credentials**
- **Username**: `wrjones` OR `walterjonesjr@gmail.com`
- **Password**: `W4lt3rj0n3s@`
- **CASA Organization**: `demo-casa`

### **What You Get**
- ✅ **Real WordPress user data**
- ✅ **CASA-specific roles and permissions**
- ✅ **Organization management**
- ✅ **Background check tracking**
- ✅ **Training status management**
- ✅ **Complete case management**

---

## 📊 **Step 6: Test Real Data**

### **Dashboard Data**
The dashboard now shows **real data** from your WordPress database:
- Active cases count
- Volunteer count  
- Recent case activity
- All pulled from WordPress tables

### **Case Creation**
Cases are now **permanently saved** to WordPress:
- Full case details stored
- Child information protected
- Court data tracked
- Assignment management

---

## 🔐 **WordPress User Management**

### **Add CASA Users**
1. **WordPress Admin** → Users → Add New
2. **Choose CASA role**:
   - CASA Administrator (full access)
   - CASA Supervisor (case management)
   - CASA Coordinator (limited access)  
   - CASA Volunteer (case-specific access)

### **User Profile Fields**
The plugin adds CASA-specific fields:
- Phone number
- Emergency contact
- Emergency contact phone
- Organization association
- Background check status
- Training completion

### **Permissions System**
- **`casa_manage_organization`**: Org settings
- **`casa_manage_all_cases`**: All case access
- **`casa_manage_volunteers`**: Volunteer management
- **`casa_view_reports`**: Report access
- **`casa_export_data`**: Data export

---

## 🏆 **You Now Have Complete WordPress Integration!**

### **✅ What's Enhanced**
- **Real WordPress user authentication**
- **CASA-specific user roles and permissions** 
- **Organization-based data separation**
- **Complete case management in WordPress**
- **Background check and training tracking**
- **Professional WordPress admin interface**

### **✅ Production Ready Features**
- **Multi-organization support**
- **Role-based access control**
- **Data persistence in WordPress**
- **Professional user management**
- **Audit trails and logging**
- **Scalable architecture**

---

## 🚀 **Next Steps**

1. **Test login** with enhanced authentication
2. **Create more users** with different CASA roles
3. **Submit test cases** to see WordPress storage
4. **Configure organization settings**
5. **Set up volunteer accounts**

**Your CASA system is now fully integrated with WordPress user management!** 🎉

---

## 🔧 **Troubleshooting**

### **Plugin Not Showing**
- Ensure file is in correct location
- Check file permissions
- Refresh WordPress admin

### **Database Tables Not Created**
- Deactivate and reactivate plugin
- Check WordPress error logs
- Verify database permissions

### **Login Issues**
- Verify user role is set correctly
- Check organization slug matches
- Ensure JWT plugin is still active

### **API Endpoints Not Working**
- Check permalink settings
- Flush rewrite rules
- Verify CORS headers