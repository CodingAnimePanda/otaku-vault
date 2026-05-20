import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mediaRouter from "./media";
import friendsRouter from "./friends";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mediaRouter);
router.use(friendsRouter);

export default router;