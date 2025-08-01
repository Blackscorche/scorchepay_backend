export const ensureBVNVerified = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.bvnVerified) {
        return res.status(403).json({ message: 'BVN verification required' });
    }

    next();
};
