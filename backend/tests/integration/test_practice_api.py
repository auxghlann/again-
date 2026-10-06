def test_get_practice_catalog(client):
    """Verifies that /api/practice returns seeded topics with completion metrics."""
    response = client.get("/api/practice")
    assert response.status_code == 200
    topics = response.json()
    assert len(topics) >= 1

    first = topics[0]
    assert "id" in first
    assert "title" in first
    assert "topic" in first
    assert "tool" in first
    assert "icon" in first
    assert "total_questions" in first
    assert first["total_questions"] > 0
    assert "answered_count" in first
    assert "done" in first


def test_get_quiz_detail_found_and_not_found(client):
    """Verifies fetching quiz details for existing and non-existing topics."""
    # Existing topic
    topic_id = "introduction-to-snowflake-sql"
    response = client.get(f"/api/quiz/{topic_id}")
    assert response.status_code == 200
    data = response.json()

    assert data["card"]["id"] == topic_id
    assert "title" in data["card"]
    assert len(data["questions"]) >= 1

    q1 = data["questions"][0]
    assert "id" in q1
    assert "prompt" in q1
    assert "type" in q1
    assert "explain" in q1

    # Non-existing topic
    res_404 = client.get("/api/quiz/non-existent-topic-slug-xyz")
    assert res_404.status_code == 404


def test_quiz_progress_lifecycle(client):
    """Verifies saving progress, retrieving updated state, resetting, and deleting inside isolated rollback transaction."""
    topic_id = "data-warehousing-concepts"

    # 1. Save progress
    payload = {
        "current_index": 2,
        "answers": {
            "0": {"value": 1, "correct": True},
            "1": {"value": False, "correct": True},
        },
        "done": False,
    }
    save_res = client.post(f"/api/quiz/{topic_id}/progress", json=payload)
    assert save_res.status_code == 200
    assert save_res.json()["status"] == "ok"

    # 2. Retrieve detail and verify progress is populated
    detail_res = client.get(f"/api/quiz/{topic_id}")
    assert detail_res.status_code == 200
    prog = detail_res.json()["progress"]
    assert prog is not None
    assert prog["current_index"] == 2
    assert prog["done"] is False
    assert len(prog["answers"]) == 2

    # 3. Reset progress
    reset_res = client.post(f"/api/quiz/{topic_id}/reset")
    assert reset_res.status_code == 200
    detail_after_reset = client.get(f"/api/quiz/{topic_id}").json()["progress"]
    assert detail_after_reset["current_index"] == 0
    assert detail_after_reset["answers"] == {}

    # 4. Delete progress
    del_res = client.delete(f"/api/quiz/{topic_id}/progress")
    assert del_res.status_code == 200
    detail_after_del = client.get(f"/api/quiz/{topic_id}").json()["progress"]
    assert detail_after_del is None
