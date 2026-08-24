import { prisma } from "db/client";
import express from "express";
const app = express();

app.use(express.json());

app.post("/signup", async (req : any, res: any ) => {

    const {username, password } = req.body;

    await prisma.user.create({
        data : {
            username,
            password
        }
    })

    res.json({
        message : "signed up"
    })
})

app.listen(3000);