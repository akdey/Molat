# backend/tests/test_alcoves.py
from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.email import MailbrixSendResult


@pytest.mark.asyncio
async def test_email_verification_otp_and_link_and_soft_gate():
    captured_emails = []

    async def fake_send_email(**kwargs):
        captured_emails.append(kwargs)
        return MailbrixSendResult(status="sent", request_id="req_1", recipients=[kwargs["to_email"]])

    with patch("app.core.email.mailbrix_client.send_email", new=AsyncMock(side_effect=fake_send_email)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Signup creates unverified user, sends verification email, and blocks login until verified
            res = await client.post(
                "/api/v1/auth/signup",
                json={"email": "husband@example.com", "username": "husband", "password": "password123"},
            )
            assert res.status_code == 201
            data = res.json()
            assert data["email_verified"] is False
            assert "X-Auth-Token" not in res.headers

            assert len(captured_emails) == 1
            # Extract OTP from subject "Verify your Molat Ex Libris email — Code: 123456"
            otp_code = captured_emails[0]["subject"].split("Code: ")[-1].strip()
            assert len(otp_code) == 6

            # 2. Unverified login is blocked with 403
            login_blocked = await client.post(
                "/api/v1/auth/login",
                json={"identifier": "husband", "password": "password123"},
            )
            assert login_blocked.status_code == 403

            # 3. Verify via 6-digit OTP (unauthenticated with identifier) -> emits token
            verify_res = await client.post(
                "/api/v1/auth/verify-email",
                json={"otp_code": otp_code, "identifier": "husband"},
            )
            assert verify_res.status_code == 200
            assert verify_res.json()["email_verified"] is True
            token_h = verify_res.headers["X-Auth-Token"]
            headers_h = {"Authorization": f"Bearer {token_h}"}

            # 4. Now Alcove creation succeeds
            alc_ok = await client.post("/api/v1/alcoves", json={"name": "Home Library"}, headers=headers_h)
            assert alc_ok.status_code == 201
            assert alc_ok.json()["invite_code"].startswith("ALC-")

            # 5. Signup second user and verify via clickable link token
            res2 = await client.post(
                "/api/v1/auth/signup",
                json={"email": "wife@example.com", "username": "wife", "password": "password123"},
            )
            assert res2.status_code == 201
            assert len(captured_emails) == 2
            text_body = captured_emails[1]["text_content"]
            link_token = text_body.split("verify_token=")[1].split("\n")[0].strip()

            link_res = await client.post("/api/v1/auth/verify-email-link", json={"token": link_token})
            assert link_res.status_code == 200
            assert link_res.json()["email_verified"] is True
            assert link_res.json()["username"] == "wife"


@pytest.mark.asyncio
async def test_alcove_sharing_personal_progress_and_indestructible_history():
    sent_invites = []

    async def fake_send_email(**kwargs):
        sent_invites.append(kwargs)
        return MailbrixSendResult(status="sent", request_id="req_inv", recipients=[kwargs["to_email"]])

    with patch("app.core.email.mailbrix_client.send_email", new=AsyncMock(side_effect=fake_send_email)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Sign up & verify both users
            await client.post(
                "/api/v1/auth/signup",
                json={"email": "amit@example.com", "username": "amit", "password": "password123"},
            )
            otp1 = sent_invites[-1]["subject"].split("Code: ")[-1].strip()
            v1 = await client.post("/api/v1/auth/verify-email", json={"otp_code": otp1, "identifier": "amit"})
            h1 = {"Authorization": f"Bearer {v1.headers['X-Auth-Token']}"}

            await client.post(
                "/api/v1/auth/signup",
                json={"email": "partner@example.com", "username": "partner", "password": "password123"},
            )
            otp2 = sent_invites[-1]["subject"].split("Code: ")[-1].strip()
            v2 = await client.post("/api/v1/auth/verify-email", json={"otp_code": otp2, "identifier": "partner"})
            h2 = {"Authorization": f"Bearer {v2.headers['X-Auth-Token']}"}

            # 1. Amit creates an Alcove & invites partner by email
            alc = (await client.post("/api/v1/alcoves", json={"name": "Dey Family Alcove"}, headers=h1)).json()
            inv_res = await client.post(
                f"/api/v1/alcoves/{alc['id']}/invite",
                json={"email": "partner@example.com"},
                headers=h1,
            )
            assert inv_res.status_code == 200
            assert inv_res.json()["email_sent"] is True
            assert sent_invites[-1]["to_email"] == "partner@example.com"

            # 2. Partner joins via invite code
            join_res = await client.post(
                "/api/v1/alcoves/join",
                json={"invite_code": alc["invite_code"]},
                headers=h2,
            )
            assert join_res.status_code == 200

            # 3. Partner adds a book and shares it selectively into the Alcove
            book_res = await client.post(
                "/api/v1/books",
                json={
                    "title": "Dune",
                    "authors": "Frank Herbert",
                    "reading_status": "COMPLETED",
                    "rating": 5,
                    "location": "Living Room Shelf",
                },
                headers=h2,
            )
            assert book_res.status_code == 201
            book_id = book_res.json()["book_id"]

            share_res = await client.put(
                f"/api/v1/alcoves/books/{book_id}/share",
                json={"shared": True},
                headers=h2,
            )
            assert share_res.status_code == 200

            # 4. Amit sees the shared book as UNREAD for himself, logs reading & updates holder
            overview_h1 = (await client.get("/api/v1/alcoves/me", headers=h1)).json()
            assert len(overview_h1["shared_books"]) == 1
            shared_dune = overview_h1["shared_books"][0]
            assert shared_dune["title"] == "Dune"
            assert shared_dune["owner_username"] == "partner"
            assert shared_dune["my_reading_status"] == "UNREAD"

            # Amit logs 25 pages on partner's book
            log_res = await client.post(
                "/api/v1/reading/logs",
                json={"book_id": book_id, "start_page": 1, "end_page": 25},
                headers=h1,
            )
            assert log_res.status_code == 201
            assert log_res.json()["book_title"] == "Dune"

            # Amit marks he has the physical copy
            holder_res = await client.put(
                f"/api/v1/alcoves/books/{book_id}/holder",
                json={"held_by_label": "ex/amit"},
                headers=h1,
            )
            assert holder_res.status_code == 200
            assert holder_res.json()["held_by_label"] == "ex/amit"

            # Check Amit's personal state is READING while partner's book remains COMPLETED (5 stars)
            overview_h1_after = (await client.get("/api/v1/alcoves/me", headers=h1)).json()
            assert overview_h1_after["shared_books"][0]["my_reading_status"] == "READING"
            assert overview_h1_after["shared_books"][0]["my_current_page"] == 25

            partner_book = (await client.get(f"/api/v1/books/{book_id}", headers=h2)).json()
            assert partner_book["reading_status"] == "COMPLETED"
            assert partner_book["rating"] == 5

            # 5. Partner deletes the book -> Amit's reading log MUST survive with book_title snapshot!
            del_res = await client.delete(f"/api/v1/books/{book_id}", headers=h2)
            assert del_res.status_code == 204

            amit_logs = (await client.get("/api/v1/reading/logs", headers=h1)).json()
            assert len(amit_logs) == 1
            assert amit_logs[0]["book_title"] == "Dune"
            assert amit_logs[0]["pages_read"] == 25
            assert amit_logs[0]["book_id"] is None
