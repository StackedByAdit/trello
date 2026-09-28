import { prisma } from "db/client";
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authMiddleware } from "./middleware";

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post("/signup", async (req : any, res: any ) => {

    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
        data : {
            email,
            password: hashedPassword
        }
    })

    res.json({
        message : "signed up"
    })
})

app.post("/signin", async (req: any, res: any) => {

    const { email, password } = req.body;

    const user = await prisma.user.findFirst({
        where : {
            email
        }
    });

    if (!user) {
        return res.status(403).json({
            message : "invalid credentials"
        });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        return res.status(403).json({
            message : "invalid credentials"
        });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);

    res.json({
        token
    });
})

app.post("/organization", authMiddleware, async (req: any, res: any) => {

    const { name, description } = req.body;

    const org = await prisma.organization.create({
        data : {
            name,
            description
        }
    });

    await prisma.membership.create({
        data : {
            userId : req.userId,
            orgId : org.id,
            role : "ADMIN"
        }
    });

    res.json(org);
});

app.get("/organizations", authMiddleware, async (req: any, res: any) => {

    const organizations = await prisma.organization.findMany({
        where : {
            memberships : {
                some : {
                    userId : req.userId
                }
            }
        }
    });

    res.json(organizations);
});

app.delete("/organization", authMiddleware, async (req: any, res: any) => {

    const { orgId } = req.body;

    await prisma.organization.delete({
        where : {
            id : orgId
        }
    });

    res.json({
        message : "organization deleted"
    });
});

app.post("/invite", authMiddleware, async (req: any, res: any) => {

    const { email, orgId } = req.body;

    const user = await prisma.user.findFirst({
        where : {
            email
        }
    });

    if (!user) {
        return res.status(404).json({
            message : "user not found"
        });
    }

    await prisma.membership.create({
        data : {
            userId : user.id,
            orgId,
            role : "MEMBER"
        }
    });

    res.json({
        message : "invited"
    });
});

app.post("/accept", authMiddleware, async (req: any, res: any) => {

    const { orgId } = req.body;

    res.json({
        message : "accepted"
    });
});

app.delete("/membership", authMiddleware, async (req: any, res: any) => {

    const { userId, orgId } = req.body;

    await prisma.membership.delete({
        where : {
            userId_orgId : {
                userId,
                orgId
            }
        }
    });

    res.json({
        message : "member removed"
    });
});

app.post("/board", authMiddleware, async (req: any, res: any) => {

    const { title, organizationId } = req.body;

    const board = await prisma.board.create({
        data : {
            title,
            organizationId
        }
    });

    res.json(board);
});

app.get("/boards", authMiddleware, async (req: any, res: any) => {

    const { orgId } = req.query;

    const boards = await prisma.board.findMany({
        where : {
            organizationId : orgId as string
        }
    });

    res.json(boards);
});

app.put("/board", authMiddleware, async (req: any, res: any) => {

    const { boardId, title } = req.body;

    const board = await prisma.board.update({
        where : {
            id : boardId
        },
        data : {
            title
        }
    });

    res.json(board);
});

app.delete("/board", authMiddleware, async (req: any, res: any) => {

    const { boardId } = req.body;

    await prisma.board.delete({
        where : {
            id : boardId
        }
    });

    res.json({
        message : "board deleted"
    });
});

app.post("/section", authMiddleware, async (req: any, res: any) => {

    const { title, boardId, order } = req.body;

    const section = await prisma.section.create({
        data : {
            title,
            boardId,
            order
        }
    });

    res.json(section);
});

app.put("/section", authMiddleware, async (req: any, res: any) => {

    const { sectionId, title, order } = req.body;

    const section = await prisma.section.update({
        where : {
            id : sectionId
        },
        data : {
            title,
            order
        }
    });

    res.json(section);
});

app.get("/sections", authMiddleware, async (req: any, res: any) => {

    const { boardId } = req.query;

    const sections = await prisma.section.findMany({
        where : {
            boardId : boardId as string
        },
        orderBy : {
            order : "asc"
        }
    });

    res.json(sections);
});

app.delete("/section", authMiddleware, async (req: any, res: any) => {

    const { sectionId } = req.body;

    await prisma.section.delete({
        where : {
            id : sectionId
        }
    });

    res.json({
        message : "section deleted"
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});