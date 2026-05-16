const MONGODB_URI="mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.5.3"
import mongoose from "mongoose";
if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}



async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}


export default dbConnect;





// // Time: 0ms
// Request 1: dbConnect()
//   → cached.conn? NO
//   → cached.promise? NO
//   → Create connection promise (takes 500ms)
//   → Wait...

// // Time: 50ms (connection still pending)
// Request 2: dbConnect()
//   → cached.conn? NO
//   → cached.promise? YES! (from Request 1)
//   → Wait for SAME promise...

// // Time: 100ms (connection still pending)
// Request 3: dbConnect()
//   → cached.conn? NO
//   → cached.promise? YES! (from Request 1)
//   → Wait for SAME promise...

// // Time: 500ms (connection completes)
// All 3 requests:
//   → cached.conn = active connection
//   → Return same connection ✅

// // Time: 600ms (new request)
// Request 4: dbConnect()
//   → cached.conn? YES! 
//   → Return immediately (no waiting) ⚡


// ┌─────────────────────────────────────────────────────────────┐
// │  Request comes in → dbConnect() is called                   │
// └─────────────────────────────────────────────────────────────┘
//                             ↓
//                 ┌───────────────────────┐
//                 │ cached.conn exists?   │
//                 └───────────────────────┘
//                     ↓ YES        ↓ NO
//             ┌───────────┐   ┌────────────────────────┐
//             │  Return   │   │ cached.promise exists? │
//             │   conn    │   └────────────────────────┘
//             └───────────┘       ↓ YES        ↓ NO
//                             ┌──────────┐  ┌─────────────────┐
//                             │   Await  │  │ Create new      │
//                             │ existing │  │ connection      │
//                             │ promise  │  │ promise         │
//                             └──────────┘  └─────────────────┘
//                                 ↓              ↓
//                             ┌──────────────────────────┐
//                             │ Store conn in cached.conn│
//                             └──────────────────────────┘
//                                        ↓
//                             ┌──────────────────────────┐
//                             │   Return connection      │
//                             └──────────────────────────┘
