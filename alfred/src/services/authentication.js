import axios from 'axios';
import { user_contextStore } from './contextStrore';

export const login=async(email,password_hash)=>{


    try {
        const response = await axios.post(`${process.env.BACKEND_URL}/login`,{
            email: email,
            password_hash: password_hash
        },{
            withCredentials:true
        });
        const data=response.data;
        return data;

         // Assuming the response contains user data and tokens
    } catch (error) {
        console.error("Login failed:", error?.response?.data?.detail);
        throw error;
    }   
}



export const signup=async(first_name,last_name,email,password_hash)=>{
    try {
        const response = await axios.post(`${process.env.BACKEND_URL}/signup`, { 
            First_Name:first_name,
            Last_Name:last_name,
            email: email,
            password_hash: password_hash
        },{
            withCredentials:true
        });
        const data=response.data;
        return data; // Assuming the response contains user data and tokens
    } catch (error) {
        console.error("Signup failed:", error);
        throw error;
    }   
}