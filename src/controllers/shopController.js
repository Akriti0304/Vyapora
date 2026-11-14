
const createShop = async (req, res) => {
    try {
        const { name, address, phone } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Shop name is required"
            });
        }

        if (name.trim().length > 50) {
            return res.status(400).json({
                success: false,
                message: "Shop name cannot exceed 50 characters"
            });
        }

        if (
            address !== undefined &&
            address !== null &&
            typeof address !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Address must be a string"
            });
        }

        if (
            phone !== undefined &&
            phone !== null &&
            typeof phone !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be a string"
            });
        }

        const { data, error } = await req.supabase
            .from("shops")
            .insert({
                name: name.trim(),
                address: address?.trim() || null,
                phone: phone?.trim() || null,
                owner_id: req.user.id
            })
            .select()
            .single();

        if (error) {
            console.error("Create shop error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not create shop"
            });
        }

        return res.status(201).json({
            success: true,
            message: "Shop created successfully",
            shop: data
        });

    } catch (error) {
        console.error("Create shop error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// GET LOGGED-IN USER'S SHOPS
const getShops = async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from("shops")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Get shops error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not retrieve shops"
            });
        }

        return res.status(200).json({
            success: true,
            count: data.length,
            shops: data
        });

    } catch (error) {
        console.error("Get shops error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// UPDATE SHOP
const updateShop = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone } = req.body;

        const updates = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Shop name cannot be empty"
                });
            }

            if (name.trim().length > 50) {
                return res.status(400).json({
                    success: false,
                    message: "Shop name cannot exceed 50 characters"
                });
            }

            updates.name = name.trim();
        }

        if (address !== undefined) {
            if (address !== null && typeof address !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Address must be a string or null"
                });
            }

            updates.address = address?.trim() || null;
        }

        if (phone !== undefined) {
            if (phone !== null && typeof phone !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Phone number must be a string or null"
                });
            }

            updates.phone = phone?.trim() || null;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one field is required"
            });
        }

        const { data, error } = await req.supabase
            .from("shops")
            .update(updates)
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) {
            console.error("Update shop error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not update shop"
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Shop not found or access denied"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Shop updated successfully",
            shop: data
        });

    } catch (error) {
        console.error("Update shop error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// DELETE SHOP
const deleteShop = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await req.supabase
            .from("shops")
            .delete()
            .eq("id", id)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Delete shop error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not delete shop"
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Shop not found or access denied"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Shop deleted successfully"
        });

    } catch (error) {
        console.error("Delete shop error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


module.exports = {
    createShop,
    getShops,
    updateShop,
    deleteShop
};
