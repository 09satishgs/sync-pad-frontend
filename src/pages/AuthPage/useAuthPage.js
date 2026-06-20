import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const useAuthPage = () => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username and password are required.');
      return;
    }

    try {
      if (isRegistering) {
        await register(username.trim(), password.trim());
        setSuccessMsg('Registration successful! Please login.');
        setIsRegistering(false);
        setPassword('');
      } else {
        await login(username.trim(), password.trim());
      }
    } catch (err) {
      setErrorMsg(err.message || 'Operation failed.');
    }
  };

  const toggleRegisterMode = () => {
    setIsRegistering((prev) => !prev);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return {
    isRegistering,
    username,
    setUsername,
    password,
    setPassword,
    errorMsg,
    successMsg,
    handleSubmit,
    toggleRegisterMode,
  };
};
