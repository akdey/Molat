import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.features.adda.models import AddaPostCreate
from app.features.adda.repository import AddaRepository
from app.features.alcoves.repository import AlcoveRepository
from app.features.auth.entity import UserEntity
from app.features.notifications.repository import NotificationRepository


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    import app.features.auth.entity  # noqa
    import app.features.books.entity  # noqa
    import app.features.alcoves.entity  # noqa
    import app.features.notifications.entity  # noqa
    import app.features.adda.entity  # noqa

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        session.add_all([
            UserEntity(
                id="usr_curator",
                email="curator@example.com",
                username="curator",
                password_hash="x",
                role="reader",
                email_verified=True,
            ),
            UserEntity(
                id="usr_member",
                email="member@example.com",
                username="member",
                password_hash="x",
                role="reader",
                email_verified=True,
            ),
        ])
        await session.commit()
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_notifications_lifecycle(db_session: AsyncSession):
    repo = NotificationRepository(db_session)
    n1 = await repo.create_notification(
        user_id="usr_member",
        notif_type="alcove_invite",
        title="Invite",
        body="Join us",
        reference_id="inv_1",
    )
    await repo.create_notification(
        user_id="usr_member",
        notif_type="adda_reply",
        title="Reply",
        body="Nice note",
        reference_id="post_1",
    )

    listing = await repo.list_for_user("usr_member")
    assert listing.unread_count == 2
    assert len(listing.notifications) == 2

    assert await repo.mark_read("usr_member", n1.id) is True
    listing2 = await repo.list_for_user("usr_member")
    assert listing2.unread_count == 1

    marked = await repo.mark_all_read("usr_member")
    assert marked == 1
    assert (await repo.list_for_user("usr_member")).unread_count == 0


@pytest.mark.asyncio
async def test_alcove_invite_accept_decline_and_remove_member(db_session: AsyncSession):
    repo = AlcoveRepository(db_session)
    alcove = await repo.create_alcove("Dey Library", "usr_curator")

    res = await repo.create_email_invite(alcove.id, "usr_curator", "member@example.com")
    assert res is not None
    _, invite = res

    accepted = await repo.accept_invite(invite.id, "usr_member", "member@example.com")
    assert accepted is not None

    overview = await repo.get_overview("usr_member", "member@example.com")
    assert len(overview.alcoves) == 1
    assert len(overview.alcoves[0].members) == 2

    # Non-curator cannot remove members
    with pytest.raises(PermissionError):
        await repo.remove_member(alcove.id, "usr_member", "usr_curator")

    # Curator can remove member
    removed = await repo.remove_member(alcove.id, "usr_curator", "usr_member")
    assert removed is not None
    overview_after = await repo.get_overview("usr_member", "member@example.com")
    assert len(overview_after.alcoves) == 0


@pytest.mark.asyncio
async def test_adda_posts_comments_and_reactions(db_session: AsyncSession):
    repo = AddaRepository(db_session)
    post = await repo.create_post(
        user_id="usr_curator",
        username="curator",
        payload=AddaPostCreate(
            post_type="quote",
            visibility="public",
            book_title="The Guide",
            book_authors="R. K. Narayan",
            page_number=12,
            content="A memorable passage.",
        ),
    )
    assert post.username == "curator"

    res = await repo.add_comment("usr_member", "member", post.id, "Great quote!")
    assert res is not None

    rx = await repo.toggle_reaction("usr_member", post.id, "resonated")
    assert rx is not None and rx[1] is True

    feed = await repo.list_posts("usr_member", scope="all")
    assert len(feed.posts) == 1
    assert feed.posts[0].reaction_counts["resonated"] == 1
    assert len(feed.posts[0].comments) == 1
