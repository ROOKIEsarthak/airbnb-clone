const express = require('express');
const cors = require('cors');
const path = require('path');

const mongoose = require('mongoose');
const multer = require('multer');
const app = express();
const cookieParser = require('cookie-parser');
require('dotenv').config();
const User = require('./models/user')
const Place = require('./models/place');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const imageDownloader = require('image-downloader');
const { log } = require('console');
const fs = require('fs');


const bcryptSalt =  bcrypt.genSaltSync(10);
const jwtSecret = 'asdadadkasjdbakduadhiauwnkq'
app.use(express.json())

app.use(cookieParser())
app.use('/uploads' , express.static(path.join(__dirname , 'uploads')));


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

app.post('/logout' , (req,res) => {
    res.cookie('token' , '').json(true)
})



app.post('/upload-by-link' , async (req,res) => {
    
    
    const {link} = req.body
    
    const newName ='photo'+ Date.now() +'.jpg';

   
    await imageDownloader.image({
        url : link,
        dest : __dirname + '/uploads/' + newName 
    });

    res.json(newName)
})

const photosMiddleware = multer({dest:'uploads/'})

app.post('/upload',photosMiddleware.array('photos' , 100) ,(req,res) =>{

    const uploadedFiles = [];
    for (let i= 0 ; i < req.files.length ; i++)
    {
        const {path , originalname} = req.files[i]
        const parts = originalname.split('.')
        const ext = parts[parts.length - 1];
        const newPath = path + '.' + ext;
        fs.renameSync(path , newPath)
        uploadedFiles.push(newPath.replace('uploads\\',''));
    }
    res.json(uploadedFiles)
})


app.post('/places' , (req,res) => {
    const {token} = req.cookies ; 
    const {
        title , address , addedPhotos , description,
        perks , extraInfo , checkIn , checkOut , maxGuests } = req.body;

    jwt.verify(token , jwtSecret ,{} , async(err,userData)=>{
        if(err) throw err;
        const placeDoc = await Place.create({
            owner:userData.id,
            title , address , photos:addedPhotos , description,
            perks , extraInfo , checkIn , checkOut , maxGuests
        });
        res.json(placeDoc)
    })
    
    
})


app.get('/places' , (req,res)=>{
    const {token} = req.cookies ; 
    jwt.verify(token , jwtSecret ,{} , async(err,userData)=>{
        const {id} = userData;
        res.json( await Place.find({owner:id}));

    });
});

app.get('/places/:id' , async(req,res) => {
    
    const{id} = req.params
    res.json(await Place.findById(id) );
})

app.put('/places', async(req,res)=>{
    
    const {token} = req.cookies ; 
    const { id,
        title , address , addedPhotos , description,
        perks , extraInfo , checkIn , checkOut , maxGuests 
    } = req.body; 
    
    jwt.verify(token , jwtSecret ,{} , async(err,userData)=>{
        if(err) throw err;
     
        
        const placeDoc = await Place.findById(id);

        if(userData.id === placeDoc.owner.toString()){
            placeDoc.set({
            title , address , photos:addedPhotos , description,
            perks , extraInfo , checkIn , checkOut , maxGuests

            })
            await placeDoc.save()
            res.json({placeDoc})
        }
    })
    })

app.listen(4000);