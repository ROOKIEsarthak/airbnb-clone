const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const cookieParser = require('cookie-parser');
require('dotenv').config();
const User = require('./models/user')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const bcryptSalt =  bcrypt.genSaltSync(10);
const jwtSecret = 'asdadadkasjdbakduadhiauwnkq'
app.use(express.json())

app.use(cookieParser())

app.use(cors({
    credentials: true,
    origin:'http://localhost:5173',
}))

console.log(process.env.MONGO_URL);


mongoose.connect(process.env.MONGO_URL);


app.get('/test' , (req,res) => {
    console.log();
    res.status(200).json('test ok')
    
});

app.post('/register', async(req,res) =>{
    const {name , email , password} = req.body

    try {
        const userDoc = await User.create({
            name,
            email,
            password : bcrypt.hashSync(password,bcryptSalt),
           });
        
           res.status(200).json(userDoc);
    } catch (error) {
        res.status(422).json(error)
        
    }
    
})

app.post('/login' , async(req,res) => {
    const {email , password} = req.body

    const userDoc = await User.findOne({email})

    if (userDoc)
    {
        
       
        const passOk = bcrypt.compareSync(password,userDoc.password)

        if (passOk){
            console.log(userDoc);
            jwt.sign({
                email: userDoc.email,
                id : userDoc._id,
                // name : userDoc.name,
            },jwtSecret , {} , (err,token)=>{

                if(err) throw err;
                res.cookie('token' , token).json(userDoc) 

            } );
            
        }else{
            res.status(422).json('pass not ok')
        }
    }
    else{
        res.status(401).json('user not found')
    }
})

app.get('/profile' , (req,res)=>{
    const {token} = req.cookies
    if(token)
    {
        jwt.verify(token , jwtSecret ,{} , async(err,userData)=>{
            if(err) throw err;

            const {name , email , _id} = await User.findById(userData.id)
            // const userDoc = await User.findById(userData.id)
            res.json({name,email,_id});

            // res.json(userDoc)
            
        })
    }
    else {
            res.json(null);
        }
    
    
})

app.listen(4000);