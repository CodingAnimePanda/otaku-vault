import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mediaRouter from "./media";
import friendsRouter from "./friends";
import quotesRouter from "./quotes";
import momentsRouter from "./moments";
import favoriteCharactersRouter from "./favorite-characters";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mediaRouter);
router.use(friendsRouter);
router.use(quotesRouter);
router.use(momentsRouter);
router.use(favoriteCharactersRouter);

export default router;