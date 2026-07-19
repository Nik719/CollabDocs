"""
Seed script: 30 users, 5 workspaces, 30 documents, versions, comments, tags, audit logs.
Run with: python manage.py shell < scripts/seed_data.py
"""
import random
from django.utils import timezone
from api.models import User, Workspace, WorkspaceMember, Document, DocumentVersion, Comment, Tag, AuditLog

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
FIRST_NAMES = [
    "Alice", "Bob", "Carol", "David", "Eva", "Frank", "Grace", "Henry",
    "Iris", "Jack", "Karen", "Leo", "Mia", "Noah", "Olivia", "Paul",
    "Quinn", "Rachel", "Sam", "Tina", "Uma", "Victor", "Wendy", "Xander",
    "Yara", "Zoe", "Aaron", "Bella", "Carlos", "Diana",
]
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson",
    "White", "Harris", "Martin", "Thompson", "Lee", "Walker", "Hall",
    "Allen", "Young", "King", "Scott", "Green", "Baker", "Adams", "Nelson", "Carter",
]
DOC_TITLES = [
    "Q3 Product Roadmap", "Onboarding Guide", "API Design Spec", "Brand Guidelines",
    "Sprint Retrospective Notes", "Security Policy", "Data Migration Plan",
    "User Research Summary", "Marketing Strategy 2026", "Engineering Handbook",
    "Release Notes v2.1", "Budget Proposal", "OKR Tracking Sheet",
    "Customer Feedback Analysis", "Architecture Decision Record",
    "Incident Report - July", "Hiring Process Overview", "Feature Spec: Search",
    "Feature Spec: Notifications", "Compliance Checklist",
    "Team Meeting Notes", "Vendor Evaluation Matrix", "SLA Documentation",
    "Deployment Runbook", "Design System Overview", "Accessibility Audit",
    "Performance Benchmarks", "Data Retention Policy", "Partnership Agreement Draft",
    "Quarterly Review Presentation",
]
DOC_CONTENTS = [
    "This document outlines the strategic direction and key initiatives for the upcoming quarter.",
    "A step-by-step guide to help new team members get up to speed quickly.",
    "Technical specification for the RESTful API including endpoints, auth, and error codes.",
    "Visual identity guidelines covering logo usage, typography, and color palette.",
    "Notes from the team retrospective covering wins, blockers, and action items.",
    "Policies and procedures to ensure the security of company data and systems.",
    "Detailed plan for migrating legacy data to the new database schema.",
    "Summary of user interviews and usability testing sessions conducted this month.",
    "Comprehensive marketing strategy including target personas and campaign plans.",
    "Internal handbook covering engineering practices, tooling, and standards.",
    "What's new and what's fixed in this release of the platform.",
    "Financial proposal detailing projected costs and expected ROI.",
    "Objectives and Key Results tracker for the current quarter.",
    "Analysis of customer feedback collected via surveys and support tickets.",
    "Record of architectural decisions including context, options, and outcomes.",
    "Post-mortem report for the July service disruption with root cause analysis.",
    "End-to-end overview of the hiring pipeline from sourcing to offer.",
    "Detailed specification for the global search feature including UI and indexing.",
    "Specification for the in-app notification system with delivery guarantees.",
    "Checklist ensuring product and processes meet regulatory compliance standards.",
    "Agenda and notes from the weekly all-hands and team sync meetings.",
    "Evaluation matrix comparing vendors across cost, features, and support.",
    "Service Level Agreement documentation for enterprise customers.",
    "Step-by-step runbook for deploying new releases to production safely.",
    "Overview of the design system components, tokens, and usage guidelines.",
    "Audit of the product for WCAG 2.1 AA compliance with remediation notes.",
    "Performance benchmarks comparing current vs previous release builds.",
    "Policy governing how long different categories of data are stored.",
    "Draft of the partnership agreement for legal review.",
    "Slides and talking points for the quarterly business review presentation.",
]
WORKSPACE_NAMES = [
    "Product Team", "Engineering", "Marketing", "Operations", "Design",
]
TAG_NAMES = [
    "strategy", "engineering", "design", "hr", "finance",
    "security", "legal", "marketing", "product", "ops",
]
ACTIONS = ["created", "updated", "deleted", "viewed", "exported"]

# ------------------------------------------------------------------
# Clear existing seed data (optional — comment out to append)
# ------------------------------------------------------------------
print("Clearing existing data...")
AuditLog.objects.all().delete()
Comment.objects.all().delete()
DocumentVersion.objects.all().delete()
Tag.objects.all().delete()
Document.objects.all().delete()
WorkspaceMember.objects.all().delete()
Workspace.objects.all().delete()
User.objects.all().delete()

# ------------------------------------------------------------------
# Users (30)
# ------------------------------------------------------------------
print("Creating 30 users...")
users = []
for i in range(30):
    u = User.objects.create(
        first_name=FIRST_NAMES[i],
        last_name=LAST_NAMES[i],
        email=f"{FIRST_NAMES[i].lower()}.{LAST_NAMES[i].lower()}@example.com",
        phone=f"+1555{str(i).zfill(7)}",
    )
    users.append(u)

# ------------------------------------------------------------------
# Workspaces (5) — each owned by a different user
# ------------------------------------------------------------------
print("Creating 5 workspaces...")
workspaces = []
for i, name in enumerate(WORKSPACE_NAMES):
    ws = Workspace.objects.create(name=name, owner=users[i])
    workspaces.append(ws)

# ------------------------------------------------------------------
# WorkspaceMembers — spread users across workspaces
# ------------------------------------------------------------------
print("Adding workspace members...")
roles = [WorkspaceMember.Role.ADMIN, WorkspaceMember.Role.EDITOR, WorkspaceMember.Role.VIEWER]
for ws_idx, ws in enumerate(workspaces):
    # owner is always admin
    WorkspaceMember.objects.create(workspace=ws, user=ws.owner, role=WorkspaceMember.Role.ADMIN)
    # add 5-8 other members per workspace
    candidates = [u for u in users if u != ws.owner]
    members = random.sample(candidates, random.randint(5, 8))
    for user in members:
        WorkspaceMember.objects.get_or_create(
            workspace=ws, user=user,
            defaults={"role": random.choice(roles)},
        )

# ------------------------------------------------------------------
# Tags (10)
# ------------------------------------------------------------------
print("Creating tags...")
tags = [Tag.objects.create(name=t) for t in TAG_NAMES]

# ------------------------------------------------------------------
# Documents (30)
# ------------------------------------------------------------------
print("Creating 30 documents...")
statuses = [Document.Status.DRAFT, Document.Status.PUBLISHED, Document.Status.ARCHIVED]
documents = []
for i in range(30):
    ws = workspaces[i % len(workspaces)]
    author = random.choice(users)
    doc = Document.objects.create(
        title=DOC_TITLES[i],
        content=DOC_CONTENTS[i],
        workspace=ws,
        created_by=author,
        status=random.choice(statuses),
    )
    # attach 1–3 tags
    doc.tags.set(random.sample(tags, random.randint(1, 3)))
    documents.append(doc)

# ------------------------------------------------------------------
# DocumentVersions — 1–3 versions per document
# ------------------------------------------------------------------
print("Creating document versions...")
for doc in documents:
    num_versions = random.randint(1, 3)
    for v in range(1, num_versions + 1):
        DocumentVersion.objects.create(
            document=doc,
            content=f"Version {v} of: {doc.content[:100]}...",
            version_number=v,
            saved_by=random.choice(users),
        )

# ------------------------------------------------------------------
# Comments — 2–5 per document, some with replies
# ------------------------------------------------------------------
print("Creating comments...")
comment_texts = [
    "Looks good, approved.", "Can we revisit section 3?",
    "Please update the timeline.", "Great work on this!",
    "Minor typo on page 2.", "This needs legal review.",
    "Agreed, let's ship it.", "Adding to next sprint.",
    "Who owns this document?", "Needs more detail here.",
]
for doc in documents:
    top_comments = []
    for _ in range(random.randint(2, 5)):
        c = Comment.objects.create(
            document=doc,
            author=random.choice(users),
            content=random.choice(comment_texts),
        )
        top_comments.append(c)
    # add 0–2 replies to a random top-level comment
    if top_comments:
        parent = random.choice(top_comments)
        for _ in range(random.randint(0, 2)):
            Comment.objects.create(
                document=doc,
                author=random.choice(users),
                content=random.choice(comment_texts),
                parent=parent,
            )

# ------------------------------------------------------------------
# AuditLogs — ~3 per document
# ------------------------------------------------------------------
print("Creating audit logs...")
for doc in documents:
    for _ in range(random.randint(2, 4)):
        AuditLog.objects.create(
            actor=random.choice(users),
            action=random.choice(ACTIONS),
            model_name="Document",
            object_id=str(doc.id),
        )

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
print("\n=== Seed complete ===")
print(f"  Users:             {User.objects.count()}")
print(f"  Workspaces:        {Workspace.objects.count()}")
print(f"  Workspace members: {WorkspaceMember.objects.count()}")
print(f"  Documents:         {Document.objects.count()}")
print(f"  Document versions: {DocumentVersion.objects.count()}")
print(f"  Tags:              {Tag.objects.count()}")
print(f"  Comments:          {Comment.objects.count()}")
print(f"  Audit logs:        {AuditLog.objects.count()}")
