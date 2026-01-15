import {
    addGroupMember,
    createGroup,
    deleteGroup,
    getAllMyGroups,
    getGroupById,
    getGroupMembers,
    removeGroupMember,
    updateGroupTransaction
} from "./groups.service.js";

export const getMyGroupsController = async (req, res) => {
    try {
        const groups = await getAllMyGroups(req.user.id);
        res.json(groups);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al obtener grupos" });
    }
};

export const getGroupMembersController = async (req, res) => {
    try {
        const { groupId } = req.params;
        const members = await getGroupMembers(groupId);
        res.json(members);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al obtener miembros del grupo" });
    }
};

export const getGroupByIdController = async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await getGroupById(groupId);
        res.json(group);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al obtener grupo" });
    }
};

export const createGroupController = async (req, res) => {
    try {
        const { name, description, members } = req.body;
        const groupId = await createGroup(name, description, req.user.id, members);
        res.json({ message: "Grupo creado correctamente", groupId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al crear grupo" });
    }
};

export const addGroupMemberController = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        await addGroupMember(groupId, userId);
        res.json({ message: "Miembro agregado correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al agregar miembro al grupo" });
    }
};

export const deleteGroupController = async (req, res) => {
    try {
        const { groupId } = req.params;
        await deleteGroup(groupId);
        res.json({ message: "Grupo eliminado correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al eliminar grupo" });
    }
};

export const deleteGroupMemberController = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        await removeGroupMember(groupId, userId);
        res.json({ message: "Miembro eliminado correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al eliminar miembro del grupo" });
    }
};

export const updateGroupController = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description, members } = req.body;
        await updateGroupTransaction(Number(groupId), name, description, members);

        res.json({ message: "Grupo actualizado correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error al actualizar grupo" });
    }
};
