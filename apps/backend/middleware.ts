import jwt from "jsonwebtoken";

export const authMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"] || req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message : "unauthorized"
        });
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

    if (!token) {
        return res.status(401).json({
            message : "unauthorized"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

        const userId = decoded?.userId !== undefined ? decoded?.userId : decoded?.id;

        if (!userId) {
            return res.status(401).json({
                message : "unauthorized"
            });
        }

        req.userId = userId;
        next();
    } catch (e) {
        return res.status(401).json({
            message : "unauthorized"
        });
    }
};
