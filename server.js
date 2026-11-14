
require("dotenv").config();

const app = require("./src/app");
const { supabase } = require("./src/config/supabase");

const PORT = process.env.PORT || 5000;

// Temporary database connection test
app.get("/api/test-db", async (req, res) => {
    try {
        const { error } = await supabase
            .from("shops")
            .select("id")
            .limit(1);

        if (error) {
            if (
                error.code === "PGRST205" ||
                error.code === "42P01"
            ) {
                return res.status(200).json({
                    success: true,
                    connection: "established",
                    message: "Supabase reachable. Shops table not created yet."
                });
            }

            throw error;
        }

        res.status(200).json({
            success: true,
            message: "Supabase connection successful"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`VYAPORA server running on port ${PORT}`);
});
