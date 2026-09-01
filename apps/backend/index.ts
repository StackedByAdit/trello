import { prisma } from "db/client";
import express from "express";
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3001;

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

 app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });