
const { supabase } = require("../config/supabase");

// USER SIGNUP
const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
                data: {
                    name: name.trim()
                }
            }
        });

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(201).json({
            success: true,
            message: "Registration request successful. Check your email if confirmation is required.",
            user: {
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name
            },
            session: data.session
                ? {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_at: data.session.expires_at
                }
                : null
        });

    } catch (error) {
        console.error("Signup error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// USER LOGIN
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
        });

        if (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name
            },
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = { signup, login };
