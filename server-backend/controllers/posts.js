const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')


const PostMessage = require('../models/postMessage.js')
const User = require('../models/user.js')
const Admin = require('../models/Admin.js')
const ChatRoom = require('../models/Chatroom')
const Report = require('../models/Report')

const getPosts = async (req, res) => {
    try {
        const postMessage = await PostMessage.find({hideAfter: { $gt:Date.now()}}).sort({hideAfter: 1})
        //console.log(postMessage);
        res.status(200).json(postMessage)
    } catch (error) {
       res.status(400).json({ message: error.message}) 
    } 
};

const getPost = async (req, res) => {
    const { postId2 } = req.body;
    try {
        const post = await PostMessage.findOne({_id: postId2})
        //console.log(postMessage);
        res.status(200).json(post)
    } catch (error) {
       res.status(400).json({ message: error.message}) 
    } 
};

const createPost = async (req, res) => {
    const post = req.body;

    // Hiding Post Part
    const leavingTimeMilliseconds  = new Date(post.leavingTime) 
    var hideTimeMilliseconds = Math.abs(new Date() - leavingTimeMilliseconds);
    const hideTime = Math.floor(hideTimeMilliseconds / (1000 * 60 * 60)).toFixed(1);
    console.log(hideTime);
    const hideAfter = Date.now() + (hideTime * 1000 * 60 * 60);
    console.log(hideAfter);
    
    // Creating chatroom
    const user = await User.findById(post.creator);
    console.log(user);
    const name = `${post.source} to ${post.destination} with ${post.name}`;
    if (user) {
        const chatroom = new ChatRoom({
            name,user: user._id, userName: user.name, userAvatar: user.avatar, leavingAt: post.leavingTime, createdAt: new Date()
          });
        
          await chatroom.save();
          //console.log(chatroom);
          const newPost = new PostMessage({...post,chatroomId: chatroom._id, hideAfter, createdAt: new Date().toISOString() })
          try {
              await newPost.save();
              const admin = await Admin.findOneAndUpdate({ _id: "60b1137d2fe6ed3438de8ed0" }, { $inc: { totalPost: 1 }}, { new: true })
              //console.log(newPost);
              res.status(201).json({newPost, message: "Your post created successfully"})
            } catch (error) {
                res.status(409).json({ message: error}) 
            }
        }
};

const updatePost = async (req, res) => {
    const {id: _id} = req.params;
    const post = req.body;

    if(!mongoose.Types.ObjectId.isValid(_id)) return res.status(404).json({message: "No post with that id, Maybe internal server error."});

    const updatedPost = await PostMessage.findByIdAndUpdate(_id, { ...post, _id }, { new: true });

    res.json({updatedPost, message: "Your post updated successfully"})
}

const deletePost = async (req, res) => {
    const { id } = req.params;
    
    if(!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({message: "No post with that id, Maybe internal server error."});

    await PostMessage.findByIdAndRemove(id);

    res.json({ message: "Post deleted successfully" })
}

const likePost = async (req, res) =>{
    const { postId, userId } = req.params;
    //console.log(req.params);
    const id = postId
    if(!userId) return res.json({ message: "Unauthenticated"})
    
    if(!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({message: "No post with that id, Maybe internal server error."});

    const post = await PostMessage.findById(id);
    const chat = await ChatRoom.findById(post.chatroomId)
    const user = await User.findById(userId);
//console.log(user);
    const index = post.likes.findIndex((id) => id === String(userId));

    if (index === -1) {
        // like the post
        post.likes.push(userId)
        user.meAsGuest.push(postId)
        chat.user.push(user._id)
        chat.userName.push(user.name)
        chat.userAvatar.push(user.avatar)
        chat.showOrNot = true
    } else {
        // dislike post
        post.likes = post.likes.filter((id) => id !== String(userId));
        user.meAsGuest = user.meAsGuest.filter((id) => id !== String(postId));
        chat.user = chat.user.filter((id)=> id !== String(user._id));
        chat.userName = chat.userName.filter((name)=> name !== String(user.name));
        chat.userAvatar = chat.userAvatar.filter((avatar)=> avatar !== String(user.avatar));
        //console.log(user.meAsGuest);
    }

    const updatedPost = await PostMessage.findByIdAndUpdate(id, post, { new: true})
    const updateUser = await User.findOneAndUpdate({ _id: userId }, user, { new: true })
    const updateChat = await ChatRoom.findOneAndUpdate({ _id: post.chatroomId}, chat, { new: true })
    //console.log(user);
    res.json({updatedPost, message: "Your ride has been confirmed."})
}

const meAsGuest = async(req, res) => {
    const {id} = req.body;

    try {
        const postMessage = await PostMessage.find({"creator": id})

        res.status(200).json(postMessage)
    } catch (error) {
       res.status(400).json({ message: error.message}) 
    } 

}

const reportPost = async(req, res) => {
    const { reportedBy, reportedPost, reportedText, postOwner } = req.body;
    //console.log(req.body);

    try {

        const report = await Report.create({ reportedBy, reportedPost, reportedText, postOwner, createdAt: new Date() })
        const admin = await Admin.findOneAndUpdate({ _id: "60b1137d2fe6ed3438de8ed0" }, { $inc: { totalReport: 1 }}, { new: true })
        res.status(200).json({report, message: "We have captured your report, We will let you know further update via email. Thank You for your report."})
        
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message}) 
    }
}

module.exports = { getPost, getPosts, createPost, updatePost, deletePost, likePost, reportPost, meAsGuest }