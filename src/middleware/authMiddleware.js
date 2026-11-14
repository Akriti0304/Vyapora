
const { createClient } = require("@supabase/supabase-js");

const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access token is required"
            });
        }

        const token = authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization header"
            });
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                },
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            }
        );

        // Verify the access token with Supabase
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired access token"
            });
        }

        // Attach authenticated user and user-scoped Supabase client
        req.user = data.user;
        req.supabase = supabase;

        next();

    } catch (error) {
        console.error("Authentication error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = { authenticateUser };
