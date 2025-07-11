import Post from "./Post";
import { auth } from "@clerk/nextjs/server";
import InfiniteFeed from "./InfiniteFeed";
import { prisma } from "@/app/prisma";

const Feed = async ({ userProfileId }: { userProfileId?: string }) => {
  const { userId } = await auth();

  if (!userId) return;
  // Формируем условие для выборки постов:
  // Если передан userProfileId — это профиль конкретного пользователя,
  // тогда берём только его посты (корневые, т.е. не комментарии)
  const whereCondition = userProfileId
    ? {
        parentPostId: null, // Только корневые посты (не комментарии)
        userId: userProfileId, // Только от указанного пользователя
      } // профиль — только посты этого пользователя
    : {
        // Иначе (если профиль не указан) — это главная лента:
        // Показываем посты текущего пользователя + тех, на кого он подписан
        parentPostId: null, //только оригинальные посты
        userId: {
          in: [
            userId,
            ...(
              await prisma.follow.findMany({
                where: { followerId: userId }, // Найти всех, на кого он подписан
                select: { followingId: true }, // Вытащить их ID
              })
            ).map((follow) => follow.followingId),
          ],
        },
      };

  const postIncludeQuery = {
    user: { select: { displayName: true, username: true, img: true } },
    _count: { select: { likes: true, rePosts: true, comments: true } },
    likes: { where: { userId: userId }, select: { id: true } },
    rePosts: { where: { userId: userId }, select: { id: true } },
    saves: { where: { userId: userId }, select: { id: true } },
  };

  const posts = await prisma.post.findMany({
    where: whereCondition,
    include: {
      rePost: {
        include: postIncludeQuery,
      },
      ...postIncludeQuery,
    },
    take: 3,
    skip: 0,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="">
      {posts.map((post) => (
        <div key={post.id}>
          <Post post={post} />
        </div>
      ))}
      <InfiniteFeed userProfileId={userProfileId} />
    </div>
  );
};

export default Feed;
