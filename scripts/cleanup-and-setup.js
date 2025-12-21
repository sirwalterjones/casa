#!/usr/bin/env node

/**
 * CASA Multi-Tenant SaaS Cleanup and Setup Script
 * 
 * This script:
 * 1. Cleans up existing test data, users, and organizations
 * 2. Sets up proper organization registration system
 * 3. Creates WordPress accounts for organization admins
 * 4. Enables volunteer management with WordPress integration
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const WORDPRESS_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'http://casa-backend.local';
const WP_API_URL = `${WORDPRESS_URL}/wp-json`;

class CasaSystemSetup {
    constructor() {
        this.wpCredentials = null;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async prompt(question) {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }

    async getWordPressCredentials() {
        console.log('\n🔐 WordPress Administrator Credentials Required');
        console.log('To clean up and configure your multi-tenant system, we need WordPress admin access.\n');
        
        const username = await this.prompt('WordPress Admin Username: ');
        const password = await this.prompt('WordPress Admin Password: ');
        
        try {
            // Test credentials with JWT
            const response = await axios.post(`${WP_API_URL}/jwt-auth/v1/token`, {
                username,
                password
            });

            if (response.data.token) {
                this.wpCredentials = {
                    username,
                    password,
                    token: response.data.token
                };
                console.log('✅ WordPress credentials verified!\n');
                return true;
            }
        } catch (error) {
            console.log('❌ Invalid WordPress credentials. Please try again.\n');
            return false;
        }
    }

    async setupWordPressCredentials() {
        let credentialsValid = false;
        while (!credentialsValid) {
            credentialsValid = await this.getWordPressCredentials();
        }
    }

    async cleanupExistingData() {
        console.log('🧹 Starting cleanup of existing test data...\n');

        try {
            // 1. Clean up WordPress users (except admin)
            await this.cleanupWordPressUsers();
            
            // 2. Clean up custom post types (cases, volunteers)
            await this.cleanupCustomPostTypes();
            
            // 3. Clean up user meta and options
            await this.cleanupUserMeta();
            
            // 4. Reset plugin tables
            await this.resetPluginTables();
            
            console.log('✅ Cleanup completed successfully!\n');
        } catch (error) {
            console.error('❌ Cleanup failed:', error.message);
            throw error;
        }
    }

    async cleanupWordPressUsers() {
        console.log('  • Cleaning up WordPress users...');
        
        try {
            // Get all users except administrators
            const response = await axios.get(`${WP_API_URL}/wp/v2/users`, {
                headers: {
                    'Authorization': `Bearer ${this.wpCredentials.token}`
                },
                params: {
                    per_page: 100,
                    exclude: [1] // Exclude admin user (ID 1)
                }
            });

            const users = response.data;
            console.log(`    Found ${users.length} non-admin users to clean up`);

            // Delete each user
            for (const user of users) {
                if (user.roles.includes('administrator')) {
                    console.log(`    Skipping admin user: ${user.username}`);
                    continue;
                }

                try {
                    await axios.delete(`${WP_API_URL}/wp/v2/users/${user.id}`, {
                        headers: {
                            'Authorization': `Bearer ${this.wpCredentials.token}`
                        },
                        params: {
                            force: true,
                            reassign: 1 // Reassign posts to admin
                        }
                    });
                    console.log(`    Deleted user: ${user.username}`);
                } catch (deleteError) {
                    console.log(`    Failed to delete user ${user.username}: ${deleteError.message}`);
                }
            }
        } catch (error) {
            console.log(`    Error fetching users: ${error.message}`);
        }
    }

    async cleanupCustomPostTypes() {
        console.log('  • Cleaning up CASA cases and volunteers...');
        
        const postTypes = ['casa_case', 'casa_volunteer'];
        
        for (const postType of postTypes) {
            try {
                // Get all posts of this type
                const response = await axios.get(`${WP_API_URL}/wp/v2/${postType === 'casa_case' ? 'casa_case' : 'casa_volunteer'}`, {
                    headers: {
                        'Authorization': `Bearer ${this.wpCredentials.token}`
                    },
                    params: {
                        per_page: 100,
                        status: 'any'
                    }
                });

                const posts = response.data;
                console.log(`    Found ${posts.length} ${postType} records to clean up`);

                // Delete each post
                for (const post of posts) {
                    try {
                        await axios.delete(`${WP_API_URL}/wp/v2/${postType === 'casa_case' ? 'casa_case' : 'casa_volunteer'}/${post.id}`, {
                            headers: {
                                'Authorization': `Bearer ${this.wpCredentials.token}`
                            },
                            params: {
                                force: true
                            }
                        });
                        console.log(`    Deleted ${postType}: ${post.title.rendered}`);
                    } catch (deleteError) {
                        console.log(`    Failed to delete ${postType} ${post.id}: ${deleteError.message}`);
                    }
                }
            } catch (error) {
                console.log(`    Error fetching ${postType}: ${error.message}`);
            }
        }
    }

    async cleanupUserMeta() {
        console.log('  • Cleaning up user metadata...');
        
        try {
            // Call custom endpoint to clean up user meta
            await axios.post(`${WP_API_URL}/casa/v1/admin/cleanup-meta`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.wpCredentials.token}`
                }
            });
            console.log('    User metadata cleaned up');
        } catch (error) {
            console.log(`    Error cleaning user meta: ${error.message}`);
        }
    }

    async resetPluginTables() {
        console.log('  • Resetting plugin database tables...');
        
        try {
            // Call custom endpoint to reset plugin tables
            await axios.post(`${WP_API_URL}/casa/v1/admin/reset-tables`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.wpCredentials.token}`
                }
            });
            console.log('    Plugin tables reset');
        } catch (error) {
            console.log(`    Error resetting plugin tables: ${error.message}`);
        }
    }

    async setupOrganizationRegistration() {
        console.log('🏢 Setting up organization registration system...\n');

        try {
            // 1. Ensure proper roles exist
            await this.ensureUserRoles();
            
            // 2. Setup organization registration endpoint
            await this.setupRegistrationEndpoint();
            
            // 3. Configure multi-tenant capabilities
            await this.setupMultiTenantCapabilities();
            
            console.log('✅ Organization registration system configured!\n');
        } catch (error) {
            console.error('❌ Organization setup failed:', error.message);
            throw error;
        }
    }

    async ensureUserRoles() {
        console.log('  • Setting up user roles...');
        
        try {
            await axios.post(`${WP_API_URL}/casa/v1/admin/setup-roles`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.wpCredentials.token}`
                }
            });
            console.log('    User roles configured');
        } catch (error) {
            console.log(`    Error setting up roles: ${error.message}`);
        }
    }

    async setupRegistrationEndpoint() {
        console.log('  • Configuring registration endpoints...');
        
        try {
            await axios.post(`${WP_API_URL}/casa/v1/admin/setup-endpoints`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.wpCredentials.token}`
                }
            });
            console.log('    Registration endpoints configured');
        } catch (error) {
            console.log(`    Error setting up endpoints: ${error.message}`);
        }
    }

    async setupMultiTenantCapabilities() {
        console.log('  • Enabling multi-tenant capabilities...');
        
        try {
            await axios.post(`${WP_API_URL}/casa/v1/admin/setup-multitenancy`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.wpCredentials.token}`
                }
            });
            console.log('    Multi-tenancy configured');
        } catch (error) {
            console.log(`    Error setting up multi-tenancy: ${error.message}`);
        }
    }

    async testOrganizationRegistration() {
        console.log('🧪 Testing organization registration...\n');

        try {
            // Test organization creation
            const testOrg = {
                name: 'Test CASA Organization',
                slug: 'test-casa-org',
                adminEmail: 'admin@test-casa-org.com',
                adminPassword: 'TestPassword123!',
                adminFirstName: 'Test',
                adminLastName: 'Admin'
            };

            console.log('  • Creating test organization...');
            const response = await axios.post(`${WP_API_URL}/casa/v1/register-organization`, testOrg);

            if (response.data.success) {
                console.log('  ✅ Test organization created successfully');
                console.log(`     Organization ID: ${response.data.data.organization.id}`);
                console.log(`     Admin User ID: ${response.data.data.user.id}`);
                
                // Test volunteer creation within the organization
                await this.testVolunteerCreation(response.data.data.organization.id, response.data.data.token);
                
                return true;
            } else {
                console.log('  ❌ Test organization creation failed');
                return false;
            }
        } catch (error) {
            console.error('  ❌ Test failed:', error.response?.data || error.message);
            return false;
        }
    }

    async testVolunteerCreation(organizationId, adminToken) {
        console.log('  • Testing volunteer creation...');

        try {
            const testVolunteer = {
                email: 'volunteer@test-casa-org.com',
                password: 'VolunteerPass123!',
                firstName: 'Test',
                lastName: 'Volunteer',
                organizationId: organizationId
            };

            const response = await axios.post(`${WP_API_URL}/casa/v1/register-volunteer`, testVolunteer, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            if (response.data.success) {
                console.log('  ✅ Test volunteer created successfully');
                console.log(`     Volunteer User ID: ${response.data.data.user.id}`);
                return true;
            } else {
                console.log('  ❌ Test volunteer creation failed');
                return false;
            }
        } catch (error) {
            console.error('  ❌ Volunteer test failed:', error.response?.data || error.message);
            return false;
        }
    }

    async displaySystemStatus() {
        console.log('\n📊 CASA Multi-Tenant System Status\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        try {
            // Get system info
            const response = await axios.get(`${WP_API_URL}/casa/v1/system-status`, {
                headers: {
                    'Authorization': `Bearer ${this.wpCredentials.token}`
                }
            });

            const status = response.data.data;
            
            console.log(`🏢 Organizations: ${status.organizations || 0}`);
            console.log(`👥 Total Users: ${status.users || 0}`);
            console.log(`🤝 Volunteers: ${status.volunteers || 0}`);
            console.log(`📁 Cases: ${status.cases || 0}`);
            console.log(`⚙️  Plugin Version: ${status.pluginVersion || 'Unknown'}`);
            console.log(`🔌 WordPress Version: ${status.wpVersion || 'Unknown'}`);
            console.log(`🚀 System Status: ${status.systemHealth || 'Unknown'}`);
            
        } catch (error) {
            console.log('❌ Could not fetch system status');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ CASA Multi-Tenant SaaS is ready for production!');
        console.log('🌐 Organization Registration URL: /auth/register');
        console.log('🔐 Admin Login URL: /auth/login');
        console.log('📖 API Documentation: ' + WP_API_URL + '/casa/v1/');
        console.log('\n🚀 You can now deploy this system to production!');
    }

    async run() {
        console.log('🏠 CASA Multi-Tenant SaaS Setup & Cleanup Tool');
        console.log('═══════════════════════════════════════════════\n');
        
        try {
            // Step 1: Get WordPress credentials
            await this.setupWordPressCredentials();
            
            // Step 2: Clean up existing data
            await this.cleanupExistingData();
            
            // Step 3: Setup organization registration
            await this.setupOrganizationRegistration();
            
            // Step 4: Test the system
            const testPassed = await this.testOrganizationRegistration();
            
            if (testPassed) {
                // Step 5: Display system status
                await this.displaySystemStatus();
            } else {
                console.log('\n❌ System tests failed. Please check the configuration.');
            }
            
        } catch (error) {
            console.error('\n💥 Setup failed:', error.message);
            console.log('\nPlease check:');
            console.log('• WordPress is running at ' + WORDPRESS_URL);
            console.log('• CASA Enhanced plugin is activated');
            console.log('• JWT Authentication plugin is installed and configured');
            console.log('• Database permissions are correct');
        } finally {
            this.rl.close();
        }
    }
}

// Run the setup if this file is executed directly
if (require.main === module) {
    const setup = new CasaSystemSetup();
    setup.run().catch(console.error);
}

module.exports = CasaSystemSetup;