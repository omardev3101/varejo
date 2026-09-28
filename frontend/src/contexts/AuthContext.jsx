import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('@VarejoPro:user');
        const storedToken = sessionStorage.getItem('@VarejoPro:token');

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData, token) => {
        setUser(userData);
        sessionStorage.setItem('@VarejoPro:user', JSON.stringify(userData));
        sessionStorage.setItem('@VarejoPro:token', token);
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem('@VarejoPro:user');
        sessionStorage.removeItem('@VarejoPro:token');
    };

    return (
        <AuthContext.Provider value={{ signed: !!user, user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
