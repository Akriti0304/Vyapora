
const addProduct = async (req, res) => {
    try {
        const {
            shop_id,
            name,
            sku,
            price,
            cost_price,
            stock_quantity,
            unit
        } = req.body;

        if (!shop_id || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Shop ID and product name are required"
            });
        }

        if (
            (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0)) ||
            (cost_price !== undefined && (!Number.isFinite(Number(cost_price)) || Number(cost_price) < 0)) ||
            (stock_quantity !== undefined && (!Number.isInteger(Number(stock_quantity)) || Number(stock_quantity) < 0))
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid price, cost price or stock quantity"
            });
        }

        const { data: shop, error: shopError } = await req.supabase
            .from("shops")
            .select("id")
            .eq("id", shop_id)
            .single();

        if (shopError || !shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found or access denied"
            });
        }

        const { data, error } = await req.supabase
            .from("products")
            .insert({
                shop_id,
                name: name.trim(),
                sku: sku?.trim() || null,
                price: price ?? 0,
                cost_price: cost_price ?? 0,
                stock_quantity: stock_quantity ?? 0,
                unit: unit?.trim() || "piece"
            })
            .select()
            .single();

        if (error) {
            console.error("Add product error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not add product"
            });
        }

        return res.status(201).json({
            success: true,
            message: "Product added successfully",
            product: data
        });

    } catch (error) {
        console.error("Add product error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// GET PRODUCTS
const getProducts = async (req, res) => {
    try {
        const { shop_id } = req.query;

        if (!shop_id) {
            return res.status(400).json({
                success: false,
                message: "Shop ID is required"
            });
        }

        const { data, error } = await req.supabase
            .from("products")
            .select("*")
            .eq("shop_id", shop_id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Get products error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not retrieve products"
            });
        }

        return res.status(200).json({
            success: true,
            count: data.length,
            products: data
        });

    } catch (error) {
        console.error("Get products error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// UPDATE PRODUCT
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const allowedFields = [
            "name",
            "sku",
            "price",
            "cost_price",
            "stock_quantity",
            "unit"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one field is required"
            });
        }

        if ("name" in updates) {
            if (typeof updates.name !== "string" || !updates.name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Product name cannot be empty"
                });
            }
            updates.name = updates.name.trim();
        }

        if (
            ["price", "cost_price"].some(field =>
                field in updates &&
                (!Number.isFinite(Number(updates[field])) || Number(updates[field]) < 0)
            ) ||
            ("stock_quantity" in updates &&
                (!Number.isInteger(Number(updates.stock_quantity)) || Number(updates.stock_quantity) < 0))
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid price, cost price or stock quantity"
            });
        }

        const { data, error } = await req.supabase
            .from("products")
            .update(updates)
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) {
            console.error("Update product error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not update product"
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Product not found or access denied"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product: data
        });

    } catch (error) {
        console.error("Update product error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// DELETE PRODUCT
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await req.supabase
            .from("products")
            .delete()
            .eq("id", id)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Delete product error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not delete product"
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Product not found or access denied"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error) {
        console.error("Delete product error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    addProduct,
    getProducts,
    updateProduct,
    deleteProduct
};
