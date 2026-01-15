import { getUserByEmail,updateUser,getUserByName, getUserForGroup } from "./users.service.js";

export const getUserByEmailController = async (req, res) => {
    try {
        const { email } = req.params;
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al obtener usuario" });
    }
};

export const getUserByNameController = async (req, res) => {
    try {
        const { name } = req.params;
        const user = await getUserByName(name);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al obtener usuario" });
    }
};

export const getUserForGroupController = async (req, res) => {
    try {
        const { startsWith } = req.query;
        const users = await getUserForGroup(startsWith);
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al buscar usuarios" });
    }
};

export const updateUserController = async (req, res) => {
    try {
        const { username, email } = req.body;
        await updateUser(id, username, email);
        res.json({ message: "Usuario actualizado correctamente" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al actualizar usuario" });
    }
};
