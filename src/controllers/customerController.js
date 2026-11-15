
const isValidUuid = (value) => {
    return typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

const createCustomer = async (req, res) => {
    try {
        const { shop_id, name, phone, email, address } = req.body;

        if (!isValidUuid(shop_id)) {
            return res.status(400).json({
                success: false,
                message: "A valid shop_id is required"
            });
        }

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Customer name is required"
            });
        }

        if (name.trim().length > 100) {
            return res.status(400).json({
                success: false,
                message: "Customer name cannot exceed 100 characters"
            });
        }

        if (typeof phone !== "string" || !phone.trim()) {
            return res.status(400).json({
                success: false,
                message: "Customer phone number is required"
            });
        }

        if (phone.trim().length > 20) {
            return res.status(400).json({
                success: false,
                message: "Phone number cannot exceed 20 characters"
            });
        }

        if (email !== undefined && email !== null &&
            typeof email !== "string") {
            return res.status(400).json({
                success: false,
                message: "Email must be a string or null"
            });
        }

        if (email && email.trim().length > 150) {
            return res.status(400).json({
                success: false,
                message: "Email cannot exceed 150 characters"
            });
        }

        if (address !== undefined && address !== null &&
            typeof address !== "string") {
            return res.status(400).json({
                success: false,
                message: "Address must be a string or null"
            });
        }

        const { data, error } = await req.supabase
            .from("customers")
            .insert({
                shop_id,
                name: name.trim(),
                phone: phone.trim(),
                email: email?.trim() || null,
                address: address?.trim() || null
            })
            .select()
            .single();

        if (error) {
            console.error("Create customer error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not create customer. Check the shop and customer details."
            });
        }

        return res.status(201).json({
            success: true,
            message: "Customer created successfully",
            customer: data
        });

    } catch (error) {
        console.error("Create customer error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getCustomers = async (req, res) => {
    try {
        const { shop_id } = req.query;

        if (!isValidUuid(shop_id)) {
            return res.status(400).json({
                success: false,
                message: "A valid shop_id query parameter is required"
            });
        }

        const { data, error } = await req.supabase
            .from("customers")
            .select("*")
            .eq("shop_id", shop_id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Get customers error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not retrieve customers"
            });
        }

        return res.status(200).json({
            success: true,
            count: data.length,
            customers: data
        });

    } catch (error) {
        console.error("Get customers error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, address } = req.body;
        const updates = {};

        if (!isValidUuid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID"
            });
        }

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Customer name cannot be empty"
                });
            }

            if (name.trim().length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Customer name cannot exceed 100 characters"
                });
            }

            updates.name = name.trim();
        }

        if (phone !== undefined) {
            if (typeof phone !== "string" || !phone.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number cannot be empty"
                });
            }

            if (phone.trim().length > 20) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number cannot exceed 20 characters"
                });
            }

            updates.phone = phone.trim();
        }

        if (email !== undefined) {
            if (email !== null && typeof email !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Email must be a string or null"
                });
            }

            if (email && email.trim().length > 150) {
                return res.status(400).json({
                    success: false,
                    message: "Email cannot exceed 150 characters"
                });
            }

            updates.email = email?.trim() || null;
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

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one field is required"
            });
        }

        const { data, error } = await req.supabase
            .from("customers")
            .update(updates)
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) {
            console.error("Update customer error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not update customer"
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Customer not found or access denied"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Customer updated successfully",
            customer: data
        });

    } catch (error) {
        console.error("Update customer error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUuid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID"
            });
        }

        const { data, error } = await req.supabase
            .from("customers")
            .delete()
            .eq("id", id)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Delete customer error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not delete customer"
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Customer not found or access denied"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Customer deleted successfully"
        });

    } catch (error) {
        console.error("Delete customer error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    createCustomer,
    getCustomers,
    updateCustomer,
    deleteCustomer
};
