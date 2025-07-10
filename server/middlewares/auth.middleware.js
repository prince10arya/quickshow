import { clerkClient } from '@clerk/express'

export const protectAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization
    console.log('token', token)
    const { userId } = req.auth();
    // Check if userId exists (meaning a user is authenticated)
    if (!userId) {
      return res.status(401).json({
        success: false,
        isAdmin: false,
        message: "Authentication required: No user found in request.",
      });
    }
    console.log("userId", userId);
    const user = await clerkClient.users.getUser(userId);
    if (user.privateMetadata.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User does not have admin privileges.",
      });
    }
    next();
  } catch (error) {
    return res.status(400).json(
      {
        success: false,
        message: error,
      }
    )
  }
}
