import { prisma } from "db/client";
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

 app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });