import { currentUser } from "@clerk/nextjs/server";
import { RedirectToSignIn } from "@clerk/nextjs";

export const InitialProfile = async () => {
    const user = await currentUser();

    if (!user) {
        return RedirectToSignIn({});
    }
};

export default InitialProfile;
