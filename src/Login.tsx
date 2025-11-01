import { useState } from 'react'
import { supabase } from './supabaseClient'
import StudentDashboard from './studentDashboard'
import LibrarianDashboard from './librarianDashboard'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<'student' | 'librarian' | null>(null)
  const [role, setRole] = useState<string|null>(null)

  const handleLogin = async () => {
    try {
      console.log('Attempting login with:', { email });
      
      // First, sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('Auth error:', authError);
        alert('Login error: ' + authError.message);
        return;
      }

      if (!authData.user) {
        console.error('No user returned from auth');
        alert('Authentication failed');
        return;
      }

      console.log('Auth successful, getting user data...');

      // Then get the user's role from the users table using the auth user's ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', authData.user.id)
        .single();

      console.log('User query result:', { userData, userError });

      if (userError) {
        console.error('User data error:', userError);
        alert(`Error getting user role: ${userError.message}`);
        return;
      }

      if (userData) {
        console.log('Login successful:', { role: userData.role, selectedRole });
        
        // Normalize role comparison (case insensitive)
        const dbRole = userData.role?.toLowerCase()
        const selected = selectedRole?.toLowerCase()
        
        // Verify the selected role matches the database role
        if (selected && dbRole !== selected) {
          alert(`Role mismatch. Your account is registered as ${userData.role}, but you selected ${selectedRole}.`);
          return;
        }
        
        // Use the database role (case sensitive)
        setRole(userData.role);
        localStorage.setItem('userEmail', userData.email || email);
        localStorage.setItem('userRole', userData.role);
        localStorage.setItem('userId', authData.user.id);
      } else {
        console.log('User role not found');
        alert('User profile not found. Please contact administrator.');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
    }
  }

  return (
    <div>
      {!role ? (
        <div className="login-container">
          <h2 className="login-title">CampusReads Library</h2>
          
          {/* Role Selection */}
          {!selectedRole ? (
            <div className="role-selection">
              <h3>Select Your Role</h3>
              <div className="role-buttons">
                <button 
                  className="role-button student"
                  onClick={() => setSelectedRole('student')}
                >
                  👤 Student
                </button>
                <button 
                  className="role-button librarian"
                  onClick={() => setSelectedRole('librarian')}
                >
                  👨‍💼 Librarian
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="role-indicator">
                <span>Login as: <strong>{selectedRole === 'student' ? '👤 Student' : '👨‍💼 Librarian'}</strong></span>
                <button className="change-role-button" onClick={() => setSelectedRole(null)}>
                  Change
                </button>
              </div>
              <div className="input-group">
                <input 
                  className="input-field"
                  type="email" 
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input 
                  className="input-field"
                  type="password" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button className="login-button" onClick={handleLogin}>
                  Login
                </button>
              </div>
            </>
          )}
        </div>
      ) : role === 'student' ? (
        <StudentDashboard />
      ) : role === 'librarian' ? (
        <LibrarianDashboard />
      ) : null}
    </div>
  )
}

