import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mediaRouter from "./media";
import friendsRouter from "./friends";
import quotesRouter from "./quotes";
import momentsRouter from "./moments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mediaRouter);
router.use(friendsRouter);
router.use(quotesRouter);
router.use(momentsRouter);

export default router;