import { prisma } from "db/client";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authMiddleware } from "./middleware";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
}

const app = express();

const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(",").map((o: string) => o.trim())
    : ["http://localhost:3000", "http://localhost:5173"];

app.use(cors({
    origin : allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    allowedHeaders : ["Content-Type", "Authorization"],
    credentials : true
}));

app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post("/signup", async (req : any, res: any ) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message : "email and password are required"
        });
    }

    const existingUser = await prisma.user.findFirst({
        where : {
            email
        }
    });

    if (existingUser) {
        return res.status(400).json({
            message : "user already exists"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
        data : {
            email,
            password: hashedPassword
        }
    });

    res.json({
        message : "signed up"
    });
});

app.post("/signin", async (req: any, res: any) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message : "email and password are required"
        });
    }

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
});

app.post("/organization", authMiddleware, async (req: any, res: any) => {

    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({
            message : "name is required"
        });
    }

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

    if (!orgId) {
        return res.status(400).json({
            message : "orgId is required"
        });
    }

    const org = await prisma.organization.findFirst({
        where : {
            id : orgId
        }
    });

    if (!org) {
        return res.status(404).json({
            message : "organization not found"
        });
    }

    const adminMembership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId,
            role : "ADMIN"
        }
    });

    if (!adminMembership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

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

    if (!email || !orgId) {
        return res.status(400).json({
            message : "email and orgId are required"
        });
    }

    const org = await prisma.organization.findFirst({
        where : {
            id : orgId
        }
    });

    if (!org) {
        return res.status(404).json({
            message : "organization not found"
        });
    }

    const adminMembership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId,
            role : "ADMIN"
        }
    });

    if (!adminMembership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

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

    if (user.id === req.userId) {
        return res.status(400).json({
            message : "cannot invite yourself"
        });
    }

    const existingMembership = await prisma.membership.findFirst({
        where : {
            userId : user.id,
            orgId
        }
    });

    if (existingMembership) {
        return res.status(400).json({
            message : "user is already a member"
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

    if (!orgId) {
        return res.status(400).json({
            message : "orgId is required"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId
        }
    });

    if (!membership) {
        return res.status(404).json({
            message : "membership not found"
        });
    }

    res.json({
        message : "accepted"
    });
});

app.delete("/membership", authMiddleware, async (req: any, res: any) => {

    const { userId, orgId } = req.body;

    if (!userId || !orgId) {
        return res.status(400).json({
            message : "userId and orgId are required"
        });
    }

    const adminMembership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId,
            role : "ADMIN"
        }
    });

    if (!adminMembership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    const targetMembership = await prisma.membership.findFirst({
        where : {
            userId,
            orgId
        }
    });

    if (!targetMembership) {
        return res.status(404).json({
            message : "member not found"
        });
    }

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

    if (!title || !organizationId) {
        return res.status(400).json({
            message : "title and organizationId are required"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

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

    if (!orgId) {
        return res.status(400).json({
            message : "orgId is required"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : orgId as string
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    const boards = await prisma.board.findMany({
        where : {
            organizationId : orgId as string
        }
    });

    res.json(boards);
});

app.put("/board", authMiddleware, async (req: any, res: any) => {

    const { boardId, title } = req.body;

    if (!boardId || !title) {
        return res.status(400).json({
            message : "boardId and title are required"
        });
    }

    const board = await prisma.board.findFirst({
        where : {
            id : boardId
        }
    });

    if (!board) {
        return res.status(404).json({
            message : "board not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    const updatedBoard = await prisma.board.update({
        where : {
            id : boardId
        },
        data : {
            title
        }
    });

    res.json(updatedBoard);
});

app.delete("/board", authMiddleware, async (req: any, res: any) => {

    const { boardId } = req.body;

    if (!boardId) {
        return res.status(400).json({
            message : "boardId is required"
        });
    }

    const board = await prisma.board.findFirst({
        where : {
            id : boardId
        }
    });

    if (!board) {
        return res.status(404).json({
            message : "board not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

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

    if (!title || !boardId || order === undefined || typeof order !== "number") {
        return res.status(400).json({
            message : "title, boardId and numeric order are required"
        });
    }

    const board = await prisma.board.findFirst({
        where : {
            id : boardId
        }
    });

    if (!board) {
        return res.status(404).json({
            message : "board not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

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

    if (!sectionId || (!title && order === undefined)) {
        return res.status(400).json({
            message : "sectionId and at least one field to update are required"
        });
    }

    const section = await prisma.section.findFirst({
        where : {
            id : sectionId
        },
        include : {
            board : true
        }
    });

    if (!section) {
        return res.status(404).json({
            message : "section not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : section.board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    const updatedSection = await prisma.section.update({
        where : {
            id : sectionId
        },
        data : {
            title : title !== undefined ? title : section.title,
            order : order !== undefined ? Number(order) : section.order
        }
    });

    res.json(updatedSection);
});

app.get("/sections", authMiddleware, async (req: any, res: any) => {

    const { boardId } = req.query;

    if (!boardId) {
        return res.status(400).json({
            message : "boardId is required"
        });
    }

    const board = await prisma.board.findFirst({
        where : {
            id : boardId as string
        }
    });

    if (!board) {
        return res.status(404).json({
            message : "board not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

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

    if (!sectionId) {
        return res.status(400).json({
            message : "sectionId is required"
        });
    }

    const section = await prisma.section.findFirst({
        where : {
            id : sectionId
        },
        include : {
            board : true
        }
    });

    if (!section) {
        return res.status(404).json({
            message : "section not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : section.board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    await prisma.section.delete({
        where : {
            id : sectionId
        }
    });

    res.json({
        message : "section deleted"
    });
});

app.post("/issue", authMiddleware, async (req: any, res: any) => {

    const { title, description, boardId, sectionId } = req.body;

    if (!title || !boardId || !sectionId) {
        return res.status(400).json({
            message : "title, boardId and sectionId are required"
        });
    }

    const board = await prisma.board.findFirst({
        where : {
            id : boardId
        }
    });

    if (!board) {
        return res.status(404).json({
            message : "board not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    const section = await prisma.section.findFirst({
        where : {
            id : sectionId,
            boardId
        }
    });

    if (!section) {
        return res.status(404).json({
            message : "section not found on this board"
        });
    }

    const issue = await prisma.issue.create({
        data : {
            title,
            description,
            boardId,
            sectionId
        }
    });

    res.json(issue);
});

app.get("/issues", authMiddleware, async (req: any, res: any) => {

    const { boardId } = req.query;

    if (!boardId) {
        return res.status(400).json({
            message : "boardId is required"
        });
    }

    const board = await prisma.board.findFirst({
        where : {
            id : boardId as string
        }
    });

    if (!board) {
        return res.status(404).json({
            message : "board not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    const issues = await prisma.issue.findMany({
        where : {
            boardId : boardId as string
        },
        orderBy : {
            createdAt : "asc"
        }
    });

    res.json(issues);
});

app.get("/issue/:issueId", authMiddleware, async (req: any, res: any) => {

    const { issueId } = req.params;

    const issue = await prisma.issue.findFirst({
        where : {
            id : issueId
        },
        include : {
            board : true,
            comments : true
        }
    });

    if (!issue) {
        return res.status(404).json({
            message : "issue not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : issue.board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    res.json(issue);
});

app.put("/issue", authMiddleware, async (req: any, res: any) => {

    const { issueId, title, description } = req.body;

    if (!issueId || (!title && description === undefined)) {
        return res.status(400).json({
            message : "issueId and at least one field to update are required"
        });
    }

    const issue = await prisma.issue.findFirst({
        where : {
            id : issueId
        },
        include : {
            board : true
        }
    });

    if (!issue) {
        return res.status(404).json({
            message : "issue not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : issue.board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    const updatedIssue = await prisma.issue.update({
        where : {
            id : issueId
        },
        data : {
            title : title !== undefined ? title : issue.title,
            description : description !== undefined ? description : issue.description
        }
    });

    res.json(updatedIssue);
});

app.put("/issue/move", authMiddleware, async (req: any, res: any) => {

    const { issueId, sectionId } = req.body;

    if (!issueId || !sectionId) {
        return res.status(400).json({
            message : "issueId and sectionId are required"
        });
    }

    const issue = await prisma.issue.findFirst({
        where : {
            id : issueId
        },
        include : {
            board : true
        }
    });

    if (!issue) {
        return res.status(404).json({
            message : "issue not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : issue.board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    const targetSection = await prisma.section.findFirst({
        where : {
            id : sectionId
        }
    });

    if (!targetSection) {
        return res.status(404).json({
            message : "target section not found"
        });
    }

    if (targetSection.boardId !== issue.boardId) {
        return res.status(400).json({
            message : "target section does not belong to the same board"
        });
    }

    const updatedIssue = await prisma.issue.update({
        where : {
            id : issueId
        },
        data : {
            sectionId
        }
    });

    res.json(updatedIssue);
});

app.delete("/issue/:issueId", authMiddleware, async (req: any, res: any) => {

    const { issueId } = req.params;

    const issue = await prisma.issue.findFirst({
        where : {
            id : issueId
        },
        include : {
            board : true
        }
    });

    if (!issue) {
        return res.status(404).json({
            message : "issue not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : issue.board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    await prisma.issue.delete({
        where : {
            id : issueId
        }
    });

    res.json({
        message : "issue deleted"
    });
});

app.post("/comment", authMiddleware, async (req: any, res: any) => {

    const { text, issueId } = req.body;

    if (!text || !issueId) {
        return res.status(400).json({
            message : "text and issueId are required"
        });
    }

    const issue = await prisma.issue.findFirst({
        where : {
            id : issueId
        },
        include : {
            board : true
        }
    });

    if (!issue) {
        return res.status(404).json({
            message : "issue not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : issue.board.organizationId
        }
    });

    if (!membership) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    const comment = await prisma.comment.create({
        data : {
            text,
            issueId,
            userId : req.userId
        }
    });

    res.json(comment);
});

app.put("/comment", authMiddleware, async (req: any, res: any) => {

    const { commentId, text } = req.body;

    if (!commentId || !text) {
        return res.status(400).json({
            message : "commentId and text are required"
        });
    }

    const comment = await prisma.comment.findFirst({
        where : {
            id : commentId
        },
        include : {
            issue : {
                include : {
                    board : true
                }
            }
        }
    });

    if (!comment) {
        return res.status(404).json({
            message : "comment not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : comment.issue.board.organizationId
        }
    });

    if (!membership || comment.userId !== req.userId) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    const updatedComment = await prisma.comment.update({
        where : {
            id : commentId
        },
        data : {
            text
        }
    });

    res.json(updatedComment);
});

app.delete("/comment", authMiddleware, async (req: any, res: any) => {

    const { commentId } = req.body;

    if (!commentId) {
        return res.status(400).json({
            message : "commentId is required"
        });
    }

    const comment = await prisma.comment.findFirst({
        where : {
            id : commentId
        },
        include : {
            issue : {
                include : {
                    board : true
                }
            }
        }
    });

    if (!comment) {
        return res.status(404).json({
            message : "comment not found"
        });
    }

    const membership = await prisma.membership.findFirst({
        where : {
            userId : req.userId,
            orgId : comment.issue.board.organizationId
        }
    });

    if (!membership || (comment.userId !== req.userId && membership.role !== "ADMIN")) {
        return res.status(403).json({
            message : "forbidden"
        });
    }

    await prisma.comment.delete({
        where : {
            id : commentId
        }
    });

    res.json({
        message : "comment deleted"
    });
});

app.use((err: any, req: any, res: any, next: any) => {
    if (err?.status === 400 || err?.statusCode === 400) {
        return res.status(400).json({
            message : "bad request"
        });
    }
    res.status(500).json({
        message : "internal server error"
    });
});

export { app };

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
}