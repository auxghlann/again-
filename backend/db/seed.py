import json
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.db.database import get_db, init_db
from backend.db.models import (
    CodingProblem,
    PracticeTopic,
    QuizQuestion,
    StudyPlan,
    TestCase,
    UserCodingSubmission,
)


def slugify(text: str) -> str:
    """Converts a string to a URL-safe lowercase slug matching the prototype."""
    text = text.lower().strip()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


# ============================================================
# Practice Topics & Conceptual Quiz Questions (Preserved)
# ============================================================

RAW_TOPICS = [
    ("Introduction to Snowflake SQL", "Snowflake", "Snowflake", "snow"),
    ("Data Warehousing Concepts", "Theory", "Theory", "book"),
    ("Understanding Data Engineering", "Theory", "Theory", "book"),
    ("Python Dictionary Comprehension", "Python", "Python", "brackets"),
    ("Data Manipulation & Joins in SQL", "SQL", "SQL", "db"),
    ("Relational Database Normalization", "SQL", "PostgreSQL", "db"),
    ("Window Functions in SQL", "SQL", "SQL", "db"),
    ("Pandas GroupBy Essentials", "Python", "Python", "brackets"),
    ("Building Dashboards in Power BI", "Power BI", "Power BI", "chart"),
    ("Tableau Calculated Fields", "Tableau", "Tableau", "chart"),
    ("Excel Lookup Functions", "Excel", "Excel", "table"),
    ("S3 Bucket Policies Basics", "AWS", "AWS", "cloud"),
    ("Azure Data Factory Pipelines", "Azure", "Azure", "cloud"),
    ("Java Streams Basics", "Java", "Java", "cup"),
    ("Dockerizing a Python App", "Docker", "Docker", "box"),
    ("Git Branching Strategies", "Git", "Git", "git"),
    ("Data Frames in R", "R", "R", "chart"),
    ("Python File I/O and JSON", "Python", "Python", "brackets"),
    ("Slowly Changing Dimensions", "Theory", "Theory", "book"),
    ("Snowflake Time Travel", "Snowflake", "Snowflake", "snow"),
]

RAW_QUIZZES: Dict[str, List[List[Any]]] = {
    "introduction-to-snowflake-sql": [
        ["mcq", "Which of the following best describes Snowflake's architecture?", ["Shared-disk", "Shared-nothing", "Multi-cluster shared data", "Single-node"], 2, "Snowflake separates storage and compute, letting multiple compute clusters share one copy of the data."],
        ["tf", "In Snowflake, compute (virtual warehouses) and storage scale independently.", True, "You can resize or suspend a warehouse without touching how the underlying data is stored."],
        ["fib", "In Snowflake, a ___ is the compute resource used to run queries.", "virtual warehouse", "Virtual warehouses are the clusters that actually execute SQL."],
        ["mcq", "Which file formats can Snowflake natively load data from?", ["Only CSV", "CSV, JSON, Parquet, Avro, ORC, XML", "Only Parquet", "Only JSON"], 1, "Snowflake's COPY INTO supports a wide range of structured and semi-structured formats."]
    ],
    "data-warehousing-concepts": [
        ["mcq", "A star schema typically consists of a central fact table connected to:", ["Other fact tables", "Dimension tables", "Staging tables", "Views"], 1, "Dimension tables surround the fact table and hold descriptive attributes."],
        ["tf", "OLAP systems are optimized for high-volume transactional writes.", False, "That describes OLTP; OLAP systems are optimized for complex analytical reads."],
        ["fib", "A ___ table stores descriptive attributes used to filter and group facts.", "dimension", "Dimension tables answer the 'who, what, where, when' around a fact."],
        ["mcq", "Which schema design normalizes dimension tables into sub-dimensions?", ["Star schema", "Snowflake schema", "Galaxy schema", "Flat schema"], 1, "A snowflake schema splits dimensions further to reduce redundancy, at the cost of more joins."]
    ],
    "understanding-data-engineering": [
        ["mcq", "Which of these best describes ETL?", ["Extract, Transform, then Load into the target", "Extract, Load, then Transform inside the target", "Encrypt, Transfer, Log", "Evaluate, Test, Launch"], 0, "In ETL, transformation happens in a separate processing layer before data lands in the target."],
        ["tf", "ELT loads raw data into the target system before transforming it.", True, "ELT pushes transformation work down into the target (often a warehouse or lakehouse)."],
        ["fib", "A ___ pipeline processes data continuously as it arrives, rather than in scheduled batches.", "streaming", "Streaming pipelines react to events in near real time instead of waiting for a batch window."],
        ["mcq", "Which of these is a common responsibility of a data engineer?", ["Designing marketing campaigns", "Building and maintaining data pipelines", "Writing UI code only", "Managing HR records"], 1, "Data engineers build the pipelines and infrastructure that move and shape data reliably."]
    ],
    "python-dictionary-comprehension": [
        ["mcq", "What does {k: v for k, v in items} produce?", ["A list", "A dictionary", "A set", "A tuple"], 1, "The curly-brace comprehension with a key:value pair builds a dict."],
        ["fib", "The expression {x: x**2 for x in range(5)} creates a dictionary mapping each number to its ___.", "square", "Each key x maps to x**2, its square."],
        ["tf", "Dictionary comprehensions can include an if condition to filter items.", True, "You can append 'if condition' to only include matching key/value pairs."],
        ["mcq", "Which comprehension swaps the keys and values of dict d?", ["{v: k for k, v in d.items()}", "{k: v for v, k in d}", "{d[k]: k for k in d.values()}", "dict(reversed(d))"], 0, "Iterating d.items() and flipping k and v in the output pair swaps keys and values."]
    ],
    "data-manipulation-joins-in-sql": [
        ["mcq", "Which join returns only rows with matches in both tables?", ["LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "FULL OUTER JOIN"], 2, "INNER JOIN keeps only rows where the join condition matches on both sides."],
        ["tf", "A LEFT JOIN returns all rows from the right table plus matched rows from the left.", False, "It is the reverse: LEFT JOIN keeps all rows from the left table, matching the right where possible."],
        ["fib", "A ___ JOIN returns all rows from both tables, matching where possible and NULLs where not.", "FULL OUTER", "FULL OUTER JOIN keeps unmatched rows from either side."],
        ["mcq", "Which clause removes duplicate rows from a result set?", ["UNIQUE", "DISTINCT", "GROUP ONLY", "FILTER"], 1, "DISTINCT collapses duplicate rows in the SELECT output."]
    ],
    "relational-database-normalization": [
        ["mcq", "Which normal form eliminates transitive dependencies?", ["1NF", "2NF", "3NF", "BCNF"], 2, "3NF requires non-key columns to depend only on the key, not on other non-key columns."],
        ["tf", "First Normal Form (1NF) requires that each column contain atomic, indivisible values.", True, "1NF disallows repeating groups or multi-valued fields in a single column."],
        ["fib", "A table is in ___NF if every non-key attribute depends on the whole primary key, not just part of it.", "2", "2NF removes partial dependencies on a composite key."],
        ["mcq", "Why might you deliberately denormalize a database?", ["To save storage only", "To improve read performance for analytics", "To enforce stricter constraints", "Normalization is never reversed"], 1, "Denormalizing trades some redundancy for fewer joins and faster reads."]
    ],
    "window-functions-in-sql": [
        ["mcq", "Which function assigns a unique sequential integer to rows within a partition, regardless of ties?", ["RANK()", "DENSE_RANK()", "ROW_NUMBER()", "NTILE()"], 2, "ROW_NUMBER() always increments by one, even when values tie."],
        ["tf", "RANK() leaves gaps in the ranking sequence after ties, while DENSE_RANK() does not.", True, "RANK() skips numbers after a tie; DENSE_RANK() keeps the sequence tight."],
        ["fib", "The ___ clause defines how rows are divided into groups before a window function is applied.", "PARTITION BY", "PARTITION BY resets the window calculation for each group."],
        ["mcq", "Which function lets you access a value from the previous row in the result set?", ["LEAD()", "LAG()", "FIRST_VALUE()", "OFFSET()"], 1, "LAG() looks backward to a prior row; LEAD() looks forward."]
    ],
    "pandas-groupby-essentials": [
        ["mcq", "What does df.groupby('col').mean() return?", ["The mean of every column, ignoring groups", "The mean of numeric columns per group", "A single overall mean", "An error"], 1, "It computes the mean of each numeric column separately for every group."],
        ["tf", "groupby() alone, without an aggregation, returns a DataFrameGroupBy object rather than a DataFrame.", True, "The grouping is lazy until you apply an aggregation or transformation."],
        ["fib", "To apply different aggregation functions to different columns, you can pass a ___ to .agg().", "dictionary", "A dict maps each column name to the function(s) you want applied to it."],
        ["mcq", "Which method turns the group keys back into regular columns after a groupby aggregation?", [".reset_index()", ".to_frame()", ".droplevel()", ".melt()"], 0, ".reset_index() moves the grouped index back into normal columns."]
    ],
    "building-dashboards-in-power-bi": [
        ["mcq", "Which Power BI component lets you write custom calculations using DAX?", ["Power Query", "Measures", "Report view", "Data view only"], 1, "Measures are DAX formulas that calculate values dynamically as filters change."],
        ["tf", "Power Query is used primarily for data transformation before it loads into the model.", True, "Power Query handles shaping and cleaning data on the way into the model."],
        ["fib", "In Power BI, a ___ is a reusable DAX calculation that responds to filters and slicers.", "measure", "Measures recalculate live based on the current filter context."],
        ["mcq", "Which visual is best suited for showing a trend over time?", ["Pie chart", "Line chart", "Card", "Matrix"], 1, "Line charts are built to show how a value changes across a continuous axis like time."]
    ],
    "tableau-calculated-fields": [
        ["mcq", "Which of these is a valid use of a Tableau calculated field?", ["Creating a new measure from existing fields", "Changing the database schema", "Installing extensions", "Editing the source CSV file"], 0, "Calculated fields derive new measures or dimensions from fields already in the data source."],
        ["tf", "Table calculations in Tableau are computed after the main query returns results, based on what is in the view.", True, "They operate on the aggregated data already brought back to Tableau, not the raw source."],
        ["fib", "The ___ function in Tableau lets you branch logic, similar to an IF statement in other languages.", "IF", "IF / THEN / ELSE handles conditional logic in a calculated field."],
        ["mcq", "Which Tableau function returns a running total of a measure across a table?", ["WINDOW_SUM()", "TOTAL()", "RUNNING_TOTAL()", "SUM_ALL()"], 0, "WINDOW_SUM(), used with an addressing/partitioning setup, produces running totals."]
    ],
    "excel-lookup-functions": [
        ["mcq", "Which function looks up a value in the first column of a range and returns a value from another column?", ["HLOOKUP", "VLOOKUP", "INDEX alone", "SUMIF"], 1, "VLOOKUP searches the leftmost column and pulls a value from a specified column to the right."],
        ["tf", "XLOOKUP can search in either direction and does not require the lookup column to be first.", True, "XLOOKUP is more flexible than VLOOKUP about column order and search direction."],
        ["fib", "Combining ___ and MATCH lets you look up values in any column, not just the first.", "INDEX", "INDEX/MATCH together avoid VLOOKUP's left-to-right limitation."],
        ["mcq", "What does the final FALSE argument in VLOOKUP(..., FALSE) specify?", ["Case-insensitive match", "Exact match", "Approximate match", "Ignore errors"], 1, "FALSE forces an exact match instead of the default approximate match."]
    ],
    "s3-bucket-policies-basics": [
        ["mcq", "What format are AWS S3 bucket policies written in?", ["YAML", "JSON", "XML", "TOML"], 1, "Bucket policies are JSON documents that define who can do what on a bucket."],
        ["tf", "By default, newly created S3 buckets are publicly accessible.", False, "New buckets are private by default, with public access blocked unless explicitly enabled."],
        ["fib", "An S3 bucket policy is a type of ___-based policy attached directly to the bucket.", "resource", "Resource-based policies live on the resource itself, unlike IAM policies attached to users or roles."],
        ["mcq", "Which setting blocks all public access to a bucket regardless of other policies?", ["Bucket versioning", "Block Public Access", "Server-side encryption", "Lifecycle rules"], 1, "Block Public Access acts as an account- or bucket-level override on top of any policy."]
    ],
    "azure-data-factory-pipelines": [
        ["mcq", "In Azure Data Factory, what defines the source and destination of a copy operation?", ["Triggers", "Linked services and datasets", "Integration runtimes only", "Alerts"], 1, "Linked services define connections; datasets point to specific data within them."],
        ["tf", "A trigger in ADF can schedule a pipeline to run automatically.", True, "Schedule, tumbling window, and event-based triggers can all kick off a pipeline run."],
        ["fib", "The ___ runtime in ADF provides the compute infrastructure used to execute activities.", "integration", "The Integration Runtime is what actually performs data movement and transformation."],
        ["mcq", "Which ADF activity is used to run large-scale data transformations?", ["Copy activity", "Data Flow activity", "Web activity", "Lookup activity"], 1, "Mapping Data Flows run transformations at scale on Spark-based compute."]
    ],
    "java-streams-basics": [
        ["mcq", "Which method transforms each element of a stream into another form?", ["filter()", "map()", "reduce()", "collect()"], 1, "map() applies a function to each element and returns a new stream of results."],
        ["tf", "Java Streams are lazily evaluated, meaning intermediate operations do not run until a terminal operation is invoked.", True, "Nothing actually executes until a terminal operation like collect() or forEach() triggers it."],
        ["fib", "The ___() terminal operation combines stream elements into a single result, like a sum.", "reduce", "reduce() folds the stream down to one accumulated value."],
        ["mcq", "Which call converts a Stream back into a List?", ["stream()", "collect(Collectors.toList())", "toArray() only", "forEach()"], 1, "collect(Collectors.toList()) gathers stream elements into a List."]
    ],
    "dockerizing-a-python-app": [
        ["mcq", "Which file defines the steps to build a Docker image?", ["docker-compose.yml", "Dockerfile", "requirements.txt", ".dockerignore"], 1, "The Dockerfile lists the instructions Docker follows to build the image layer by layer."],
        ["tf", "The .dockerignore file works like .gitignore, excluding files from the build context.", True, "It keeps unnecessary files out of what gets sent to the Docker build."],
        ["fib", "The ___ instruction in a Dockerfile specifies the base image to build from.", "FROM", "Every Dockerfile starts by declaring its base image with FROM."],
        ["mcq", "Which command builds an image from a Dockerfile in the current directory?", ["docker run .", "docker build .", "docker start .", "docker pull ."], 1, "docker build reads the Dockerfile in the given context (here, the current directory)."]
    ],
    "git-branching-strategies": [
        ["mcq", "In Git Flow, which branch is used to prepare a new production release?", ["hotfix", "release", "feature", "main"], 1, "A release branch is cut from develop to stabilize and prepare a version for production."],
        ["tf", "Trunk-based development favors short-lived branches merged frequently into a single main branch.", True, "Trunk-based development minimizes long-lived branches to reduce merge conflicts."],
        ["fib", "A ___ branch is typically created off main to quickly patch a critical bug in production.", "hotfix", "Hotfix branches let teams fix urgent issues without waiting on the normal release cycle."],
        ["mcq", "What does 'git rebase' primarily do, compared to 'git merge'?", ["Deletes commit history", "Replays commits on top of another base", "Only merges tags", "Renames branches"], 1, "Rebase reapplies your commits on top of a new base commit, producing a linear history."]
    ],
    "data-frames-in-r": [
        ["mcq", "Which function returns the structure (types) of columns in an R data frame?", ["head()", "str()", "summary() only", "dim() only"], 1, "str() prints a compact summary of each column's type and sample values."],
        ["tf", "In R, you can select a column from a data frame using the $ operator.", True, "df$col returns that column as a vector."],
        ["fib", "The ___ package (part of tidyverse) provides fast, readable functions like filter() and mutate() for data frames.", "dplyr", "dplyr is the standard tidyverse package for data manipulation verbs."],
        ["mcq", "Which function combines two data frames by matching on a common column?", ["cbind()", "rbind()", "merge()", "append()"], 2, "merge() performs a join between two data frames based on shared key columns."]
    ],
    "python-file-i-o-and-json": [
        ["mcq", "Which function converts a Python dictionary into a JSON string?", ["json.load()", "json.dumps()", "json.read()", "json.parse()"], 1, "json.dumps() serializes a Python object into a JSON-formatted string."],
        ["tf", "Opening a file with 'with open(...) as f:' automatically closes the file when the block ends.", True, "The context manager guarantees the file is closed, even if an error occurs."],
        ["fib", "The json.___() function reads JSON data directly from an open file object into a Python object.", "load", "json.load() parses a file object; json.loads() parses a string."],
        ["mcq", "Which file mode opens a file for appending without overwriting existing content?", ["'w'", "'r'", "'a'", "'x'"], 2, "'a' mode appends new writes to the end of the existing file."]
    ],
    "slowly-changing-dimensions": [
        ["mcq", "Which SCD type overwrites the old value with the new one, keeping no history?", ["Type 0", "Type 1", "Type 2", "Type 3"], 1, "Type 1 simply overwrites the attribute, so history is lost."],
        ["tf", "SCD Type 2 preserves history by adding a new row for each change, often with effective date columns.", True, "Type 2 tracks history by inserting new rows and marking which one is current."],
        ["fib", "SCD Type ___ keeps limited history by adding a new column to store the previous value alongside the current one.", "3", "Type 3 stores just the prior value in an extra column, not a full row history."],
        ["mcq", "In a Type 2 SCD, which columns are commonly used to mark the currently active row?", ["created_at only", "is_current and effective date columns", "primary key only", "row count"], 1, "An is_current flag plus start/end dates identify which version of a row is active."]
    ],
    "snowflake-time-travel": [
        ["mcq", "What does Snowflake's Time Travel feature let you do?", ["Schedule future queries", "Query or restore data as it existed at a past point in time", "Encrypt historical data", "Speed up joins"], 1, "Time Travel lets you access historical versions of data within a retention window."],
        ["tf", "The default Time Travel retention period can vary by Snowflake edition, with Enterprise allowing longer retention than Standard.", True, "Standard editions default to a shorter window than Enterprise and above."],
        ["fib", "The ___ clause lets you query a table as it existed before a certain time, e.g. AT(TIMESTAMP => ...).", "AT", "AT (or BEFORE) is used with Time Travel to specify the historical point to query."],
        ["mcq", "After the Time Travel retention period ends, data enters which phase before permanent deletion?", ["Archive", "Fail-safe", "Cold storage", "Snapshot"], 1, "Fail-safe is a 7-day recovery period after Time Travel expires, usable only by Snowflake support."]
    ],
}


# ============================================================
# Three-Tier Curated SQL Study Plans
# ============================================================

SQL_STUDY_PLANS = [
    {
        "id": "sql-beginner",
        "title": "SQL Beginner",
        "subtitle": "Master fundamental queries, filtering, sorting, and conditional logic",
        "language": "SQL",
        "badge_text": "SQL",
    },
    {
        "id": "sql-intermediate",
        "title": "SQL Intermediate",
        "subtitle": "Multi-table joins, aggregations, grouping, and conditional expressions",
        "language": "SQL",
        "badge_text": "SQL",
    },
    {
        "id": "sql-advance",
        "title": "SQL Advance",
        "subtitle": "Window functions, common table expressions (CTEs), and complex data analysis",
        "language": "SQL",
        "badge_text": "SQL+",
    },
]


# ============================================================
# 15 Complete, Working SQL Coding Problems & Fixtures
# ============================================================

SQL_CODING_PROBLEMS = [
    # ------------------------------------------------------------
    # SQL Beginner Track
    # ------------------------------------------------------------
    {
        "id": "sql-beginner:low-stock-inventory-alert",
        "plan_id": "sql-beginner",
        "title": "Low Stock Inventory Alert",
        "order_index": 1,
        "difficulty": "Easy",
        "tags": ["Filtering", "Comparison", "Sorting"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Inventory (
    item_id INT PRIMARY KEY,
    item_name VARCHAR(100),
    category VARCHAR(50),
    quantity_in_stock INT,
    reorder_threshold INT,
    is_discontinued BOOLEAN
);
INSERT INTO Inventory (item_id, item_name, category, quantity_in_stock, reorder_threshold, is_discontinued) VALUES
(101, 'Wireless Mouse', 'Electronics', 15, 20, false),
(102, 'Mechanical Keyboard', 'Electronics', 42, 25, false),
(103, 'USB-C Cable', 'Accessories', 8, 10, false),
(104, 'Desk Pad', 'Accessories', 5, 10, true),
(105, 'Ergonomic Chair', 'Furniture', 3, 5, false);
""",
        "canonical_solution": """SELECT
    item_id,
    item_name,
    category,
    quantity_in_stock
FROM
    Inventory
WHERE
    is_discontinued = false
    AND quantity_in_stock <= reorder_threshold
ORDER BY
    quantity_in_stock ASC,
    item_id ASC;
""",
        "description_md": """A retail warehouse needs to monitor active items that are running low on inventory.

Write a solution to find all active (not discontinued) items where the current stock is less than or equal to the reorder threshold.

Return the result table ordered by `quantity_in_stock` in ascending order, and then by `item_id` in ascending order for ties.

### Table: `Inventory`

| Column Name | Type |
|---|---|
| `item_id` | int |
| `item_name` | varchar |
| `category` | varchar |
| `quantity_in_stock` | int |
| `reorder_threshold` | int |
| `is_discontinued` | boolean |

`item_id` is the primary key for this table.
`is_discontinued` is a boolean flag indicating if the product has been phased out.

### Example 1

**Input:**

`Inventory` table:

| item_id | item_name | category | quantity_in_stock | reorder_threshold | is_discontinued |
|---|---|---|---|---|---|
| 101 | Wireless Mouse | Electronics | 15 | 20 | false |
| 102 | Mechanical Keyboard | Electronics | 42 | 25 | false |
| 103 | USB-C Cable | Accessories | 8 | 10 | false |
| 104 | Desk Pad | Accessories | 5 | 10 | true |
| 105 | Ergonomic Chair | Furniture | 3 | 5 | false |

**Output:**

| item_id | item_name | category | quantity_in_stock |
|---|---|---|---|
| 105 | Ergonomic Chair | Furniture | 3 |
| 103 | USB-C Cable | Accessories | 8 |
| 101 | Wireless Mouse | Electronics | 15 |

**Explanation:**
- Desk Pad (`104`) has 5 in stock (<= 10), but is discontinued, so it is omitted.
- Ergonomic Chair (`105`), USB-C Cable (`103`), and Wireless Mouse (`101`) are active and need reordering.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Inventory",
                    "columns": ["item_id", "item_name", "category", "quantity_in_stock", "reorder_threshold", "is_discontinued"],
                },
                "expected_output_json": {
                    "columns": ["item_id", "item_name", "category", "quantity_in_stock"],
                    "rows": [
                        {"item_id": 105, "item_name": "Ergonomic Chair", "category": "Furniture", "quantity_in_stock": 3},
                        {"item_id": 103, "item_name": "USB-C Cable", "category": "Accessories", "quantity_in_stock": 8},
                        {"item_id": 101, "item_name": "Wireless Mouse", "category": "Electronics", "quantity_in_stock": 15},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-beginner:subscription-upgrade-candidates",
        "plan_id": "sql-beginner",
        "title": "Subscription Tier Upgrade Candidates",
        "order_index": 2,
        "difficulty": "Easy",
        "tags": ["Filtering", "NULL Handling", "Boolean"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE UserAccounts (
    user_id INT PRIMARY KEY,
    username VARCHAR(50),
    current_plan VARCHAR(20),
    monthly_logins INT,
    has_payment_method BOOLEAN,
    discount_code VARCHAR(20)
);
INSERT INTO UserAccounts (user_id, username, current_plan, monthly_logins, has_payment_method, discount_code) VALUES
(1, 'alex_m', 'Free', 28, true, NULL),
(2, 'sarah_k', 'Free', 12, true, NULL),
(3, 'david_r', 'Pro', 45, true, 'SUMMER20'),
(4, 'elena_w', 'Free', 35, false, NULL),
(5, 'marcus_t', 'Free', 22, true, 'WELCOME10'),
(6, 'chloe_b', 'Free', 30, true, NULL);
""",
        "canonical_solution": """SELECT
    user_id,
    username,
    monthly_logins
FROM
    UserAccounts
WHERE
    current_plan = 'Free'
    AND monthly_logins > 20
    AND has_payment_method = true
    AND discount_code IS NULL
ORDER BY
    monthly_logins DESC,
    user_id ASC;
""",
        "description_md": """A SaaS product growth team wants to identify high-engagement Free-tier accounts that are prime candidates for upgrading to a paid tier.

Write a solution to find all users on the `'Free'` plan who meet **all** of the following conditions:
1. Logged in more than 20 times in the current month (`monthly_logins > 20`).
2. Have already linked a valid payment method (`has_payment_method = true`).
3. Have **no** active discount code (`discount_code IS NULL`).

Return the result table ordered by `monthly_logins` in descending order, then by `user_id` in ascending order.

### Table: `UserAccounts`

| Column Name | Type |
|---|---|
| `user_id` | int |
| `username` | varchar |
| `current_plan` | varchar |
| `monthly_logins` | int |
| `has_payment_method` | boolean |
| `discount_code` | varchar |

### Example 1

**Input:**

`UserAccounts` table:

| user_id | username | current_plan | monthly_logins | has_payment_method | discount_code |
|---|---|---|---|---|---|
| 1 | alex_m | Free | 28 | true | NULL |
| 2 | sarah_k | Free | 12 | true | NULL |
| 3 | david_r | Pro | 45 | true | SUMMER20 |
| 4 | elena_w | Free | 35 | false | NULL |
| 5 | marcus_t | Free | 22 | true | WELCOME10 |
| 6 | chloe_b | Free | 30 | true | NULL |

**Output:**

| user_id | username | monthly_logins |
|---|---|---|
| 6 | chloe_b | 30 |
| 1 | alex_m | 28 |

**Explanation:**
- `chloe_b` (30 logins) and `alex_m` (28 logins) are Free tier, have saved payment methods, and no promo codes.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "UserAccounts",
                    "columns": ["user_id", "username", "current_plan", "monthly_logins", "has_payment_method", "discount_code"],
                },
                "expected_output_json": {
                    "columns": ["user_id", "username", "monthly_logins"],
                    "rows": [
                        {"user_id": 6, "username": "chloe_b", "monthly_logins": 30},
                        {"user_id": 1, "username": "alex_m", "monthly_logins": 28},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-beginner:high-value-settled-transactions",
        "plan_id": "sql-beginner",
        "title": "High-Value Settled Transactions",
        "order_index": 3,
        "difficulty": "Easy",
        "tags": ["Filtering", "Comparison", "Operator Precedence"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Transactions (
    tx_id INT PRIMARY KEY,
    sender_id INT,
    receiver_id INT,
    amount NUMERIC(10, 2),
    currency VARCHAR(3),
    status VARCHAR(20)
);
INSERT INTO Transactions (tx_id, sender_id, receiver_id, amount, currency, status) VALUES
(501, 12, 18, 750.00, 'USD', 'Settled'),
(502, 14, 14, 900.00, 'USD', 'Settled'),
(503, 22, 35, 480.00, 'EUR', 'Settled'),
(504, 30, 44, 320.00, 'USD', 'Settled'),
(505, 19, 27, 850.00, 'GBP', 'Settled'),
(506, 15, 88, 620.00, 'EUR', 'Pending'),
(507, 41, 53, 510.00, 'USD', 'Settled');
""",
        "canonical_solution": """SELECT
    tx_id,
    sender_id,
    receiver_id,
    amount,
    currency
FROM
    Transactions
WHERE
    status = 'Settled'
    AND sender_id != receiver_id
    AND (
        (currency = 'USD' AND amount > 500.00)
        OR (currency = 'EUR' AND amount > 450.00)
    )
ORDER BY
    amount DESC,
    tx_id ASC;
""",
        "description_md": """A compliance operations team reviews high-value cross-account payments.

Write a solution to extract all transactions that satisfy the following criteria:
1. The transaction status is `'Settled'`.
2. The transaction is **not** a self-transfer (`sender_id != receiver_id`).
3. Either the currency is `'USD'` with an amount strictly greater than `500.00`, OR the currency is `'EUR'` with an amount strictly greater than `450.00`.

Return the result table ordered by `amount` descending, then by `tx_id` ascending.

### Table: `Transactions`

| Column Name | Type |
|---|---|
| `tx_id` | int |
| `sender_id` | int |
| `receiver_id` | int |
| `amount` | numeric |
| `currency` | varchar |
| `status` | varchar |

### Example 1

**Input:**

`Transactions` table:

| tx_id | sender_id | receiver_id | amount | currency | status |
|---|---|---|---|---|---|
| 501 | 12 | 18 | 750.00 | USD | Settled |
| 502 | 14 | 14 | 900.00 | USD | Settled |
| 503 | 22 | 35 | 480.00 | EUR | Settled |
| 504 | 30 | 44 | 320.00 | USD | Settled |
| 505 | 19 | 27 | 850.00 | GBP | Settled |
| 506 | 15 | 88 | 620.00 | EUR | Pending |
| 507 | 41 | 53 | 510.00 | USD | Settled |

**Output:**

| tx_id | sender_id | receiver_id | amount | currency |
|---|---|---|---|---|
| 501 | 12 | 18 | 750.00 | USD |
| 507 | 41 | 53 | 510.00 | USD |
| 503 | 22 | 35 | 480.00 | EUR |

**Explanation:**
- 502 is excluded because `sender_id == receiver_id`.
- 505 is excluded because currency is GBP.
- 506 is excluded because status is Pending.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Transactions",
                    "columns": ["tx_id", "sender_id", "receiver_id", "amount", "currency", "status"],
                },
                "expected_output_json": {
                    "columns": ["tx_id", "sender_id", "receiver_id", "amount", "currency"],
                    "rows": [
                        {"tx_id": 501, "sender_id": 12, "receiver_id": 18, "amount": 750.00, "currency": "USD"},
                        {"tx_id": 507, "sender_id": 41, "receiver_id": 53, "amount": 510.00, "currency": "USD"},
                        {"tx_id": 503, "sender_id": 22, "receiver_id": 35, "amount": 480.00, "currency": "EUR"},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-beginner:active-content-creators",
        "plan_id": "sql-beginner",
        "title": "Active Content Creators",
        "order_index": 4,
        "difficulty": "Easy",
        "tags": ["DISTINCT", "Filtering", "IN Operator"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE ContentPosts (
    post_id INT PRIMARY KEY,
    creator_id INT,
    post_type VARCHAR(20),
    view_count INT,
    is_published BOOLEAN
);
INSERT INTO ContentPosts (post_id, creator_id, post_type, view_count, is_published) VALUES
(1, 101, 'video', 2400, true),
(2, 101, 'podcast', 1100, true),
(3, 102, 'article', 4500, true),
(4, 103, 'video', 850, true),
(5, 104, 'podcast', 3200, false),
(6, 105, 'podcast', 1500, true),
(7, 102, 'video', 1250, true);
""",
        "canonical_solution": """SELECT DISTINCT
    creator_id
FROM
    ContentPosts
WHERE
    is_published = true
    AND post_type IN ('video', 'podcast')
    AND view_count >= 1000
ORDER BY
    creator_id ASC;
""",
        "description_md": """A media streaming platform rewards active digital creators who produce popular audiovisual content.

Write a solution to find all unique `creator_id`s who have published (`is_published = true`) at least one post of type `'video'` or `'podcast'` that achieved at least 1,000 views (`view_count >= 1000`).

Return the result table ordered by `creator_id` in ascending order.

### Table: `ContentPosts`

| Column Name | Type |
|---|---|
| `post_id` | int |
| `creator_id` | int |
| `post_type` | varchar |
| `view_count` | int |
| `is_published` | boolean |

### Example 1

**Input:**

`ContentPosts` table:

| post_id | creator_id | post_type | view_count | is_published |
|---|---|---|---|---|
| 1 | 101 | video | 2400 | true |
| 2 | 101 | podcast | 1100 | true |
| 3 | 102 | article | 4500 | true |
| 4 | 103 | video | 850 | true |
| 5 | 104 | podcast | 3200 | false |
| 6 | 105 | podcast | 1500 | true |
| 7 | 102 | video | 1250 | true |

**Output:**

| creator_id |
|---|
| 101 |
| 102 |
| 105 |

**Explanation:**
- 101 has published video (2400) and podcast (1100).
- 102 has published video (1250). The article (4500) is ignored because it is not video/podcast.
- 104 has 3200 views but `is_published = false`.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "ContentPosts",
                    "columns": ["post_id", "creator_id", "post_type", "view_count", "is_published"],
                },
                "expected_output_json": {
                    "columns": ["creator_id"],
                    "rows": [
                        {"creator_id": 101},
                        {"creator_id": 102},
                        {"creator_id": 105},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-beginner:customer-email-domain-cleaner",
        "plan_id": "sql-beginner",
        "title": "Customer Email Domain Cleaner",
        "order_index": 5,
        "difficulty": "Easy",
        "tags": ["String Functions", "Filtering", "LIKE"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Customers (
    customer_id INT PRIMARY KEY,
    full_name VARCHAR(100),
    email VARCHAR(100),
    account_status VARCHAR(20)
);
INSERT INTO Customers (customer_id, full_name, email, account_status) VALUES
(1, 'Jordan Bell', 'jbell@company.com', 'Active'),
(2, 'Morgan Vance', 'mvance@external.io', 'Active'),
(3, 'Samir Patel', 'sp@gmail.com', 'Active'),
(4, 'Avery Thomas', 'athomas@freemail.net', 'Suspended'),
(5, 'Taylor Lee', 'tlee@datacorp.org', 'Active');
""",
        "canonical_solution": """SELECT
    customer_id,
    full_name,
    email
FROM
    Customers
WHERE
    account_status = 'Active'
    AND email NOT LIKE '%@company.com'
    AND LENGTH(email) >= 15
ORDER BY
    customer_id ASC;
""",
        "description_md": """A CRM system needs to isolate active external customer accounts for security auditing.

Write a solution to extract all customers who satisfy:
1. `account_status` is `'Active'`.
2. The email address does **not** end with `'@company.com'` (exclude internal team accounts).
3. The total length of the email address string is at least 15 characters (`LENGTH(email) >= 15`).

Return the result table ordered by `customer_id` in ascending order.

### Table: `Customers`

| Column Name | Type |
|---|---|
| `customer_id` | int |
| `full_name` | varchar |
| `email` | varchar |
| `account_status` | varchar |

### Example 1

**Input:**

`Customers` table:

| customer_id | full_name | email | account_status |
|---|---|---|---|
| 1 | Jordan Bell | jbell@company.com | Active |
| 2 | Morgan Vance | mvance@external.io | Active |
| 3 | Samir Patel | sp@gmail.com | Active |
| 4 | Avery Thomas | athomas@freemail.net | Suspended |
| 5 | Taylor Lee | tlee@datacorp.org | Active |

**Output:**

| customer_id | full_name | email |
|---|---|---|
| 2 | Morgan Vance | mvance@external.io |
| 5 | Taylor Lee | tlee@datacorp.org |

**Explanation:**
- 1 is internal (`@company.com`).
- 3 (`sp@gmail.com`) has length 12, which is less than 15.
- 4 is Suspended.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Customers",
                    "columns": ["customer_id", "full_name", "email", "account_status"],
                },
                "expected_output_json": {
                    "columns": ["customer_id", "full_name", "email"],
                    "rows": [
                        {"customer_id": 2, "full_name": "Morgan Vance", "email": "mvance@external.io"},
                        {"customer_id": 5, "full_name": "Taylor Lee", "email": "tlee@datacorp.org"},
                    ],
                },
            }
        ],
    },

    # ------------------------------------------------------------
    # SQL Intermediate Track
    # ------------------------------------------------------------
    {
        "id": "sql-intermediate:unfulfilled-high-priority-tickets",
        "plan_id": "sql-intermediate",
        "title": "Unfulfilled High-Priority Support Tickets",
        "order_index": 1,
        "difficulty": "Medium",
        "tags": ["LEFT JOIN", "NULL Handling", "Filtering"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Tickets (
    ticket_id INT PRIMARY KEY,
    customer_id INT,
    priority VARCHAR(20),
    subject VARCHAR(100)
);
CREATE TEMP TABLE TicketResolutions (
    resolution_id INT PRIMARY KEY,
    ticket_id INT,
    agent_id INT,
    resolved_notes VARCHAR(100)
);
INSERT INTO Tickets (ticket_id, customer_id, priority, subject) VALUES
(201, 1001, 'URGENT', 'Database outage on us-east'),
(202, 1002, 'LOW', 'Typography bug in footer'),
(203, 1003, 'URGENT', 'Billing card charge failure'),
(204, 1004, 'HIGH', 'API rate limit reset'),
(205, 1005, 'URGENT', 'SSO Login loop');
INSERT INTO TicketResolutions (resolution_id, ticket_id, agent_id, resolved_notes) VALUES
(1, 201, 99, 'Rebooted primary database node'),
(2, 204, 88, 'Quota raised to 10k/min');
""",
        "canonical_solution": """SELECT
    t.ticket_id,
    t.customer_id,
    t.subject
FROM
    Tickets t
    LEFT JOIN TicketResolutions r ON t.ticket_id = r.ticket_id
WHERE
    t.priority = 'URGENT'
    AND r.resolution_id IS NULL
ORDER BY
    t.ticket_id ASC;
""",
        "description_md": """An IT engineering operations team must track critical unresolved service requests.

Write a solution to find all `'URGENT'` priority tickets that have **no** matching record in the `TicketResolutions` table.

Return the result table with `ticket_id`, `customer_id`, and `subject`, ordered by `ticket_id` in ascending order.

### Table: `Tickets`

| Column Name | Type |
|---|---|
| `ticket_id` | int |
| `customer_id` | int |
| `priority` | varchar |
| `subject` | varchar |

### Table: `TicketResolutions`

| Column Name | Type |
|---|---|
| `resolution_id` | int |
| `ticket_id` | int |
| `agent_id` | int |
| `resolved_notes` | varchar |

### Example 1

**Input:**

`Tickets` table:

| ticket_id | customer_id | priority | subject |
|---|---|---|---|
| 201 | 1001 | URGENT | Database outage on us-east |
| 202 | 1002 | LOW | Typography bug in footer |
| 203 | 1003 | URGENT | Billing card charge failure |
| 204 | 1004 | HIGH | API rate limit reset |
| 205 | 1005 | URGENT | SSO Login loop |

`TicketResolutions` table:

| resolution_id | ticket_id | agent_id | resolved_notes |
|---|---|---|---|
| 1 | 201 | 99 | Rebooted primary database node |
| 2 | 204 | 88 | Quota raised to 10k/min |

**Output:**

| ticket_id | customer_id | subject |
|---|---|---|
| 203 | 1003 | Billing card charge failure |
| 205 | 1005 | SSO Login loop |

**Explanation:**
- 201 is URGENT but resolved in `TicketResolutions`.
- 203 and 205 are URGENT and have no resolution record.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Tickets",
                    "columns": ["ticket_id", "customer_id", "priority", "subject"],
                },
                "expected_output_json": {
                    "columns": ["ticket_id", "customer_id", "subject"],
                    "rows": [
                        {"ticket_id": 203, "customer_id": 1003, "subject": "Billing card charge failure"},
                        {"ticket_id": 205, "customer_id": 1005, "subject": "SSO Login loop"},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-intermediate:customer-spend-and-order-frequency",
        "plan_id": "sql-intermediate",
        "title": "Customer Spend and Order Frequency",
        "order_index": 2,
        "difficulty": "Medium",
        "tags": ["LEFT JOIN", "Aggregation", "COALESCE"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Customers (
    customer_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    sign_up_year INT
);
CREATE TEMP TABLE Orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_total NUMERIC(10, 2),
    order_status VARCHAR(20)
);
INSERT INTO Customers (customer_id, first_name, sign_up_year) VALUES
(1, 'Alice', 2024),
(2, 'Bob', 2024),
(3, 'Charlie', 2023),
(4, 'Diana', 2024);
INSERT INTO Orders (order_id, customer_id, order_total, order_status) VALUES
(101, 1, 120.50, 'Completed'),
(102, 1, 79.50, 'Completed'),
(103, 2, 45.00, 'Cancelled'),
(104, 3, 210.00, 'Completed');
""",
        "canonical_solution": """SELECT
    c.customer_id,
    c.first_name,
    COUNT(CASE WHEN o.order_status = 'Completed' THEN o.order_id END) AS completed_orders,
    COALESCE(SUM(CASE WHEN o.order_status = 'Completed' THEN o.order_total ELSE 0 END), 0.00) AS total_spend
FROM
    Customers c
    LEFT JOIN Orders o ON c.customer_id = o.customer_id
WHERE
    c.sign_up_year = 2024
GROUP BY
    c.customer_id,
    c.first_name
ORDER BY
    total_spend DESC,
    c.customer_id ASC;
""",
        "description_md": """An e-commerce business wants to analyze the purchasing habits of all customers who registered in `2024`.

Write a solution to report:
1. `customer_id`
2. `first_name`
3. `completed_orders`: Total number of orders with `order_status = 'Completed'`.
4. `total_spend`: Total amount spent on `'Completed'` orders. If a customer placed no completed orders, display `0.00`.

Only include customers with `sign_up_year = 2024`.

Return the result table ordered by `total_spend` in descending order, then by `customer_id` in ascending order.

### Table: `Customers`

| Column Name | Type |
|---|---|
| `customer_id` | int |
| `first_name` | varchar |
| `sign_up_year` | int |

### Table: `Orders`

| Column Name | Type |
|---|---|
| `order_id` | int |
| `customer_id` | int |
| `order_total` | numeric |
| `order_status` | varchar |

### Example 1

**Input:**

`Customers` table:

| customer_id | first_name | sign_up_year |
|---|---|---|
| 1 | Alice | 2024 |
| 2 | Bob | 2024 |
| 3 | Charlie | 2023 |
| 4 | Diana | 2024 |

`Orders` table:

| order_id | customer_id | order_total | order_status |
|---|---|---|---|
| 101 | 1 | 120.50 | Completed |
| 102 | 1 | 79.50 | Completed |
| 103 | 2 | 45.00 | Cancelled |
| 104 | 3 | 210.00 | Completed |

**Output:**

| customer_id | first_name | completed_orders | total_spend |
|---|---|---|---|
| 1 | Alice | 2 | 200.00 |
| 2 | Bob | 0 | 0.00 |
| 4 | Diana | 0 | 0.00 |

**Explanation:**
- Alice spent 120.50 + 79.50 = 200.00 across 2 completed orders.
- Bob placed 1 order, but it was Cancelled, so count is 0 and spend is 0.00.
- Diana placed 0 orders, so count is 0 and spend is 0.00.
- Charlie is excluded because he signed up in 2023.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Customers",
                    "columns": ["customer_id", "first_name", "sign_up_year"],
                },
                "expected_output_json": {
                    "columns": ["customer_id", "first_name", "completed_orders", "total_spend"],
                    "rows": [
                        {"customer_id": 1, "first_name": "Alice", "completed_orders": 2, "total_spend": 200.00},
                        {"customer_id": 2, "first_name": "Bob", "completed_orders": 0, "total_spend": 0.00},
                        {"customer_id": 4, "first_name": "Diana", "completed_orders": 0, "total_spend": 0.00},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-intermediate:warehouse-fulfillment-bottlenecks",
        "plan_id": "sql-intermediate",
        "title": "Warehouse Fulfillment Bottlenecks",
        "order_index": 3,
        "difficulty": "Medium",
        "tags": ["INNER JOIN", "HAVING", "Aggregation"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Warehouses (
    warehouse_id INT PRIMARY KEY,
    warehouse_name VARCHAR(50),
    region VARCHAR(30)
);
CREATE TEMP TABLE Shipments (
    shipment_id INT PRIMARY KEY,
    warehouse_id INT,
    dispatch_days INT,
    status VARCHAR(20)
);
INSERT INTO Warehouses (warehouse_id, warehouse_name, region) VALUES
(1, 'Central Hub', 'Midwest'),
(2, 'Pacific Depot', 'West'),
(3, 'Atlantic Express', 'East');
INSERT INTO Shipments (shipment_id, warehouse_id, dispatch_days, status) VALUES
(10, 1, 4, 'Delivered'),
(11, 1, 5, 'Delivered'),
(12, 1, 2, 'Cancelled'),
(13, 2, 2, 'Delivered'),
(14, 2, 1, 'Delivered'),
(15, 3, 6, 'Delivered'),
(16, 3, 3, 'Delivered'),
(17, 3, 4, 'Delivered');
""",
        "canonical_solution": """SELECT
    w.warehouse_id,
    w.warehouse_name,
    COUNT(s.shipment_id) AS total_delivered,
    ROUND(AVG(s.dispatch_days)::numeric, 1) AS avg_dispatch_days
FROM
    Warehouses w
    INNER JOIN Shipments s ON w.warehouse_id = s.warehouse_id
WHERE
    s.status = 'Delivered'
GROUP BY
    w.warehouse_id,
    w.warehouse_name
HAVING
    AVG(s.dispatch_days) > 3.0
    AND COUNT(s.shipment_id) >= 2
ORDER BY
    avg_dispatch_days DESC,
    w.warehouse_id ASC;
""",
        "description_md": """A logistics company wants to identify warehouse distribution facilities facing dispatch bottlenecks.

Write a solution to report:
1. `warehouse_id`
2. `warehouse_name`
3. `total_delivered`: Number of delivered shipments.
4. `avg_dispatch_days`: Average dispatch days rounded to **1 decimal place**.

Only include warehouses where:
- The average dispatch days for `'Delivered'` shipments is **strictly greater than 3.0 days**.
- The warehouse has processed **at least 2** `'Delivered'` shipments.

Return the result table ordered by `avg_dispatch_days` in descending order, then by `warehouse_id` in ascending order.

### Table: `Warehouses`

| Column Name | Type |
|---|---|
| `warehouse_id` | int |
| `warehouse_name` | varchar |
| `region` | varchar |

### Table: `Shipments`

| Column Name | Type |
|---|---|
| `shipment_id` | int |
| `warehouse_id` | int |
| `dispatch_days` | int |
| `status` | varchar |

### Example 1

**Input:**

`Warehouses` table:

| warehouse_id | warehouse_name | region |
|---|---|---|
| 1 | Central Hub | Midwest |
| 2 | Pacific Depot | West |
| 3 | Atlantic Express | East |

`Shipments` table:

| shipment_id | warehouse_id | dispatch_days | status |
|---|---|---|---|
| 10 | 1 | 4 | Delivered |
| 11 | 1 | 5 | Delivered |
| 12 | 1 | 2 | Cancelled |
| 13 | 2 | 2 | Delivered |
| 14 | 2 | 1 | Delivered |
| 15 | 3 | 6 | Delivered |
| 16 | 3 | 3 | Delivered |
| 17 | 3 | 4 | Delivered |

**Output:**

| warehouse_id | warehouse_name | total_delivered | avg_dispatch_days |
|---|---|---|---|
| 1 | Central Hub | 2 | 4.5 |
| 3 | Atlantic Express | 3 | 4.3 |

**Explanation:**
- Central Hub has 2 delivered shipments with avg (4 + 5) / 2 = 4.5 days.
- Atlantic Express has 3 delivered shipments with avg (6 + 3 + 4) / 3 = 4.3 days.
- Pacific Depot has avg 1.5 days, which is not > 3.0.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Warehouses",
                    "columns": ["warehouse_id", "warehouse_name", "region"],
                },
                "expected_output_json": {
                    "columns": ["warehouse_id", "warehouse_name", "total_delivered", "avg_dispatch_days"],
                    "rows": [
                        {"warehouse_id": 1, "warehouse_name": "Central Hub", "total_delivered": 2, "avg_dispatch_days": 4.5},
                        {"warehouse_id": 3, "warehouse_name": "Atlantic Express", "total_delivered": 3, "avg_dispatch_days": 4.3},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-intermediate:marketing-campaign-conversion-rates",
        "plan_id": "sql-intermediate",
        "title": "Marketing Campaign Conversion Rates",
        "order_index": 4,
        "difficulty": "Medium",
        "tags": ["INNER JOIN", "Conditional Aggregation", "HAVING"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE AdCampaigns (
    campaign_id INT PRIMARY KEY,
    campaign_name VARCHAR(50)
);
CREATE TEMP TABLE Attributions (
    attribution_id INT PRIMARY KEY,
    campaign_id INT,
    channel VARCHAR(30),
    is_converted BOOLEAN
);
INSERT INTO AdCampaigns (campaign_id, campaign_name) VALUES
(1, 'Spring Launch'),
(2, 'Summer Promo'),
(3, 'Fall Discount');
INSERT INTO Attributions (attribution_id, campaign_id, channel, is_converted) VALUES
(101, 1, 'Social', true),
(102, 1, 'Search', false),
(103, 1, 'Email', true),
(104, 1, 'Search', true),
(105, 2, 'Social', false),
(106, 2, 'Email', false),
(107, 3, 'Search', true);
""",
        "canonical_solution": """SELECT
    c.campaign_id,
    c.campaign_name,
    COUNT(a.attribution_id) AS total_attributions,
    ROUND(
        (SUM(CASE WHEN a.is_converted THEN 1 ELSE 0 END)::numeric / COUNT(a.attribution_id)) * 100.0,
        2
    ) AS conversion_rate
FROM
    AdCampaigns c
    INNER JOIN Attributions a ON c.campaign_id = a.campaign_id
GROUP BY
    c.campaign_id,
    c.campaign_name
HAVING
    COUNT(a.attribution_id) > 1
ORDER BY
    conversion_rate DESC,
    c.campaign_id ASC;
""",
        "description_md": """A digital marketing agency tracks ad click attribution to calculate campaign efficiency.

Write a solution to report:
1. `campaign_id`
2. `campaign_name`
3. `total_attributions`: Total count of attribution events recorded for the campaign.
4. `conversion_rate`: Percentage of events that converted (`is_converted = true`), calculated as `(conversions / total_attributions) * 100.0`, rounded to **2 decimal places**.

Only include campaigns with **more than 1** attribution event (`COUNT(attribution_id) > 1`).

Return the result table ordered by `conversion_rate` in descending order, then by `campaign_id` in ascending order.

### Table: `AdCampaigns`

| Column Name | Type |
|---|---|
| `campaign_id` | int |
| `campaign_name` | varchar |

### Table: `Attributions`

| Column Name | Type |
|---|---|
| `attribution_id` | int |
| `campaign_id` | int |
| `channel` | varchar |
| `is_converted` | boolean |

### Example 1

**Input:**

`AdCampaigns` table:

| campaign_id | campaign_name |
|---|---|
| 1 | Spring Launch |
| 2 | Summer Promo |
| 3 | Fall Discount |

`Attributions` table:

| attribution_id | campaign_id | channel | is_converted |
|---|---|---|---|
| 101 | 1 | Social | true |
| 102 | 1 | Search | false |
| 103 | 1 | Email | true |
| 104 | 1 | Search | true |
| 105 | 2 | Social | false |
| 106 | 2 | Email | false |
| 107 | 3 | Search | true |

**Output:**

| campaign_id | campaign_name | total_attributions | conversion_rate |
|---|---|---|---|
| 1 | Spring Launch | 4 | 75.00 |
| 2 | Summer Promo | 2 | 0.00 |

**Explanation:**
- Spring Launch had 3 conversions out of 4 events = 75.00%.
- Summer Promo had 0 conversions out of 2 events = 0.00%.
- Fall Discount had only 1 attribution event, so it is omitted by the `> 1` filter.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "AdCampaigns",
                    "columns": ["campaign_id", "campaign_name"],
                },
                "expected_output_json": {
                    "columns": ["campaign_id", "campaign_name", "total_attributions", "conversion_rate"],
                    "rows": [
                        {"campaign_id": 1, "campaign_name": "Spring Launch", "total_attributions": 4, "conversion_rate": 75.00},
                        {"campaign_id": 2, "campaign_name": "Summer Promo", "total_attributions": 2, "conversion_rate": 0.00},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-intermediate:course-instructor-enrollment-matching",
        "plan_id": "sql-intermediate",
        "title": "Course Instructor Enrollment Matching",
        "order_index": 5,
        "difficulty": "Medium",
        "tags": ["LEFT JOIN", "GROUP BY", "HAVING"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Instructors (
    instructor_id INT PRIMARY KEY,
    instructor_name VARCHAR(50)
);
CREATE TEMP TABLE Courses (
    course_id INT PRIMARY KEY,
    course_name VARCHAR(50),
    instructor_id INT
);
CREATE TEMP TABLE Enrollments (
    enrollment_id INT PRIMARY KEY,
    course_id INT,
    student_id INT
);
INSERT INTO Instructors (instructor_id, instructor_name) VALUES
(1, 'Dr. Smith'),
(2, 'Prof. Davis'),
(3, 'Dr. Hernandez');
INSERT INTO Courses (course_id, course_name, instructor_id) VALUES
(101, 'Intro to Databases', 1),
(102, 'Advanced Algorithms', 2),
(103, 'Linear Algebra', 3),
(104, 'Cloud Computing', 1);
INSERT INTO Enrollments (enrollment_id, course_id, student_id) VALUES
(1, 101, 501),
(2, 101, 502),
(3, 101, 503),
(4, 102, 504),
(5, 103, 505),
(6, 103, 506);
""",
        "canonical_solution": """SELECT
    i.instructor_name,
    c.course_name,
    COUNT(e.student_id) AS enrolled_students
FROM
    Courses c
    INNER JOIN Instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN Enrollments e ON c.course_id = e.course_id
GROUP BY
    i.instructor_name,
    c.course_name
HAVING
    COUNT(e.student_id) < 3
ORDER BY
    enrolled_students ASC,
    c.course_name ASC;
""",
        "description_md": """A university academic council is reviewing low-enrollment courses to reallocate teaching assistants.

Write a solution to report the instructor name, course name, and number of enrolled students for every course that has **fewer than 3 enrolled students** (including courses with zero enrollments).

Return the result table ordered by `enrolled_students` in ascending order, then by `course_name` in ascending order.

### Table: `Instructors`

| Column Name | Type |
|---|---|
| `instructor_id` | int |
| `instructor_name` | varchar |

### Table: `Courses`

| Column Name | Type |
|---|---|
| `course_id` | int |
| `course_name` | varchar |
| `instructor_id` | int |

### Table: `Enrollments`

| Column Name | Type |
|---|---|
| `enrollment_id` | int |
| `course_id` | int |
| `student_id` | int |

### Example 1

**Input:**

`Instructors` table:

| instructor_id | instructor_name |
|---|---|
| 1 | Dr. Smith |
| 2 | Prof. Davis |
| 3 | Dr. Hernandez |

`Courses` table:

| course_id | course_name | instructor_id |
|---|---|---|
| 101 | Intro to Databases | 1 |
| 102 | Advanced Algorithms | 2 |
| 103 | Linear Algebra | 3 |
| 104 | Cloud Computing | 1 |

`Enrollments` table:

| enrollment_id | course_id | student_id |
|---|---|---|
| 1 | 101 | 501 |
| 2 | 101 | 502 |
| 3 | 101 | 503 |
| 4 | 102 | 504 |
| 5 | 103 | 505 |
| 6 | 103 | 506 |

**Output:**

| instructor_name | course_name | enrolled_students |
|---|---|---|
| Dr. Smith | Cloud Computing | 0 |
| Prof. Davis | Advanced Algorithms | 1 |
| Dr. Hernandez | Linear Algebra | 2 |

**Explanation:**
- Cloud Computing has 0 enrolled students.
- Advanced Algorithms has 1 student.
- Linear Algebra has 2 students.
- Intro to Databases has 3 students, so it is omitted by `< 3`.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Courses",
                    "columns": ["course_id", "course_name", "instructor_id"],
                },
                "expected_output_json": {
                    "columns": ["instructor_name", "course_name", "enrolled_students"],
                    "rows": [
                        {"instructor_name": "Dr. Smith", "course_name": "Cloud Computing", "enrolled_students": 0},
                        {"instructor_name": "Prof. Davis", "course_name": "Advanced Algorithms", "enrolled_students": 1},
                        {"instructor_name": "Dr. Hernandez", "course_name": "Linear Algebra", "enrolled_students": 2},
                    ],
                },
            }
        ],
    },

    # ------------------------------------------------------------
    # SQL Advance Track
    # ------------------------------------------------------------
    {
        "id": "sql-advance:department-top-three-salaries",
        "plan_id": "sql-advance",
        "title": "Department Top Three Salaries",
        "order_index": 1,
        "difficulty": "Hard",
        "tags": ["DENSE_RANK", "Window Functions", "JOIN"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Department (
    id INT PRIMARY KEY,
    name VARCHAR(50)
);
CREATE TEMP TABLE Employee (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    salary INT,
    departmentId INT
);
INSERT INTO Department (id, name) VALUES (1, 'IT'), (2, 'Sales');
INSERT INTO Employee (id, name, salary, departmentId) VALUES
(1, 'Joe', 85000, 1),
(2, 'Henry', 80000, 2),
(3, 'Sam', 60000, 2),
(4, 'Max', 90000, 1),
(5, 'Janet', 69000, 1),
(6, 'Randy', 85000, 1),
(7, 'Will', 70000, 1);
""",
        "canonical_solution": """WITH RankedEmployees AS (
    SELECT
        d.name AS Department,
        e.name AS Employee,
        e.salary AS Salary,
        DENSE_RANK() OVER (
            PARTITION BY e.departmentId
            ORDER BY e.salary DESC
        ) AS rnk
    FROM
        Employee e
        JOIN Department d ON e.departmentId = d.id
)
SELECT
    Department,
    Employee,
    Salary
FROM
    RankedEmployees
WHERE
    rnk <= 3
ORDER BY
    Department ASC,
    Salary DESC,
    Employee ASC;
""",
        "description_md": """A company's executives want to see who earns the most money in each of the company's departments. A high earner in a department is an employee who has a salary in the **top three unique salaries** for that department.

Write a solution to find the employees who are high earners in each of the departments.

Return the result table ordered by `Department` ascending, `Salary` descending, and `Employee` ascending.

### Table: `Employee`

| Column Name | Type |
|---|---|
| `id` | int |
| `name` | varchar |
| `salary` | int |
| `departmentId` | int |

### Table: `Department`

| Column Name | Type |
|---|---|
| `id` | int |
| `name` | varchar |

### Example 1

**Input:**

`Employee` table:

| id | name | salary | departmentId |
|---|---|---|---|
| 1 | Joe | 85000 | 1 |
| 2 | Henry | 80000 | 2 |
| 3 | Sam | 60000 | 2 |
| 4 | Max | 90000 | 1 |
| 5 | Janet | 69000 | 1 |
| 6 | Randy | 85000 | 1 |
| 7 | Will | 70000 | 1 |

`Department` table:

| id | name |
|---|---|
| 1 | IT |
| 2 | Sales |

**Output:**

| Department | Employee | Salary |
|---|---|---|
| IT | Max | 90000 |
| IT | Joe | 85000 |
| IT | Randy | 85000 |
| IT | Will | 70000 |
| Sales | Henry | 80000 |
| Sales | Sam | 60000 |

**Explanation:**
In the IT department:
- Max earns 90,000 (Rank 1)
- Joe and Randy both earn 85,000 (Rank 2)
- Will earns 70,000 (Rank 3)
- Janet earns 69,000 (Rank 4, excluded)
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Employee",
                    "columns": ["id", "name", "salary", "departmentId"],
                },
                "expected_output_json": {
                    "columns": ["Department", "Employee", "Salary"],
                    "rows": [
                        {"Department": "IT", "Employee": "Max", "Salary": 90000},
                        {"Department": "IT", "Employee": "Joe", "Salary": 85000},
                        {"Department": "IT", "Employee": "Randy", "Salary": 85000},
                        {"Department": "IT", "Employee": "Will", "Salary": 70000},
                        {"Department": "Sales", "Employee": "Henry", "Salary": 80000},
                        {"Department": "Sales", "Employee": "Sam", "Salary": 60000},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-advance:rank-scores",
        "plan_id": "sql-advance",
        "title": "Rank Scores",
        "order_index": 2,
        "difficulty": "Medium",
        "tags": ["DENSE_RANK", "Window Functions"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Scores (
    id INT PRIMARY KEY,
    score NUMERIC(5, 2)
);
INSERT INTO Scores (id, score) VALUES
(1, 3.50),
(2, 3.65),
(3, 4.00),
(4, 3.85),
(5, 4.00),
(6, 3.65);
""",
        "canonical_solution": """SELECT
    score,
    DENSE_RANK() OVER (ORDER BY score DESC) AS rank
FROM
    Scores
ORDER BY
    score DESC;
""",
        "description_md": """Write a solution to find the rank of the scores. The ranking should be calculated according to the following rules:
- The scores should be ranked from highest to lowest.
- If there is a tie between two scores, both should have the same ranking.
- After a tie, the next ranking number should be the next consecutive integer value. In other words, there should be no holes between ranks.

Return the result table ordered by `score` in descending order.

### Table: `Scores`

| Column Name | Type |
|---|---|
| `id` | int |
| `score` | decimal |

### Example 1

**Input:**

`Scores` table:

| id | score |
|---|---|
| 1 | 3.50 |
| 2 | 3.65 |
| 3 | 4.00 |
| 4 | 3.85 |
| 5 | 4.00 |
| 6 | 3.65 |

**Output:**

| score | rank |
|---|---|
| 4.00 | 1 |
| 4.00 | 1 |
| 3.85 | 2 |
| 3.65 | 3 |
| 3.65 | 3 |
| 3.50 | 4 |
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Scores",
                    "columns": ["id", "score"],
                },
                "expected_output_json": {
                    "columns": ["score", "rank"],
                    "rows": [
                        {"score": 4.00, "rank": 1},
                        {"score": 4.00, "rank": 1},
                        {"score": 3.85, "rank": 2},
                        {"score": 3.65, "rank": 3},
                        {"score": 3.65, "rank": 3},
                        {"score": 3.50, "rank": 4},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-advance:consecutive-numbers",
        "plan_id": "sql-advance",
        "title": "Consecutive Numbers",
        "order_index": 3,
        "difficulty": "Medium",
        "tags": ["Window Functions", "LAG", "CTEs"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Logs (
    id INT PRIMARY KEY,
    num INT
);
INSERT INTO Logs (id, num) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 2),
(5, 1),
(6, 2),
(7, 2);
""",
        "canonical_solution": """WITH LaggedLogs AS (
    SELECT
        num,
        LAG(num, 1) OVER (ORDER BY id) AS prev1,
        LAG(num, 2) OVER (ORDER BY id) AS prev2
    FROM
        Logs
)
SELECT DISTINCT
    num AS ConsecutiveNums
FROM
    LaggedLogs
WHERE
    num = prev1
    AND num = prev2;
""",
        "description_md": """Find all numbers that appear at least three times consecutively in the `Logs` table.

Return the result table in any order with column name `ConsecutiveNums`.

### Table: `Logs`

| Column Name | Type |
|---|---|
| `id` | int |
| `num` | varchar |

### Example 1

**Input:**

`Logs` table:

| id | num |
|---|---|
| 1 | 1 |
| 2 | 1 |
| 3 | 1 |
| 4 | 2 |
| 5 | 1 |
| 6 | 2 |
| 7 | 2 |

**Output:**

| ConsecutiveNums |
|---|
| 1 |

**Explanation:**
`1` is the only number that appears consecutively for at least three IDs (1, 2, 3).
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Logs",
                    "columns": ["id", "num"],
                },
                "expected_output_json": {
                    "columns": ["ConsecutiveNums"],
                    "rows": [
                        {"ConsecutiveNums": 1},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-advance:exchange-seats",
        "plan_id": "sql-advance",
        "title": "Exchange Seats",
        "order_index": 4,
        "difficulty": "Medium",
        "tags": ["CASE WHEN", "Window Functions", "Modulus"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Seat (
    id INT PRIMARY KEY,
    student VARCHAR(50)
);
INSERT INTO Seat (id, student) VALUES
(1, 'Abbot'),
(2, 'Doris'),
(3, 'Emerson'),
(4, 'Green'),
(5, 'Jeames');
""",
        "canonical_solution": """SELECT
    id,
    CASE
        WHEN id % 2 = 1 AND id + 1 <= (SELECT MAX(id) FROM Seat) THEN
            LEAD(student) OVER (ORDER BY id)
        WHEN id % 2 = 0 THEN
            LAG(student) OVER (ORDER BY id)
        ELSE
            student
    END AS student
FROM
    Seat
ORDER BY
    id ASC;
""",
        "description_md": """Write a solution to swap the seat id of every two consecutive students. If the number of students is odd, the id of the last student is not swapped.

Return the result table ordered by `id` in ascending order.

### Table: `Seat`

| Column Name | Type |
|---|---|
| `id` | int |
| `student` | varchar |

### Example 1

**Input:**

`Seat` table:

| id | student |
|---|---|
| 1 | Abbot |
| 2 | Doris |
| 3 | Emerson |
| 4 | Green |
| 5 | Jeames |

**Output:**

| id | student |
|---|---|
| 1 | Doris |
| 2 | Abbot |
| 3 | Green |
| 4 | Emerson |
| 5 | Jeames |

**Explanation:**
- 1 and 2 are swapped (Abbot <-> Doris).
- 3 and 4 are swapped (Emerson <-> Green).
- 5 is the last odd student, so Jeames remains at seat 5.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Seat",
                    "columns": ["id", "student"],
                },
                "expected_output_json": {
                    "columns": ["id", "student"],
                    "rows": [
                        {"id": 1, "student": "Doris"},
                        {"id": 2, "student": "Abbot"},
                        {"id": 3, "student": "Green"},
                        {"id": 4, "student": "Emerson"},
                        {"id": 5, "student": "Jeames"},
                    ],
                },
            }
        ],
    },
    {
        "id": "sql-advance:human-traffic-of-stadium",
        "plan_id": "sql-advance",
        "title": "Human Traffic of Stadium",
        "order_index": 5,
        "difficulty": "Hard",
        "tags": ["Window Functions", "CTEs", "Island Grouping"],
        "starter_code": "-- Write your PostgreSQL query statement below\n",
        "setup_sql": """CREATE TEMP TABLE Stadium (
    id INT PRIMARY KEY,
    visit_date DATE,
    people INT
);
INSERT INTO Stadium (id, visit_date, people) VALUES
(1, '2024-01-01', 10),
(2, '2024-01-02', 109),
(3, '2024-01-03', 150),
(4, '2024-01-04', 99),
(5, '2024-01-05', 145),
(6, '2024-01-06', 1455),
(7, '2024-01-07', 199),
(8, '2024-01-09', 188);
""",
        "canonical_solution": """WITH HighTraffic AS (
    SELECT
        id,
        visit_date,
        people,
        id - ROW_NUMBER() OVER (ORDER BY id) AS grp
    FROM
        Stadium
    WHERE
        people >= 100
),
GroupCounts AS (
    SELECT
        id,
        visit_date,
        people,
        COUNT(*) OVER (PARTITION BY grp) AS grp_count
    FROM
        HighTraffic
)
SELECT
    id,
    visit_date,
    people
FROM
    GroupCounts
WHERE
    grp_count >= 3
ORDER BY
    visit_date ASC;
""",
        "description_md": """Write a solution to display the records with three or more consecutive rows where `people >= 100` on each day.

Return the result table ordered by `visit_date` in ascending order.

### Table: `Stadium`

| Column Name | Type |
|---|---|
| `id` | int |
| `visit_date` | date |
| `people` | int |

### Example 1

**Input:**

`Stadium` table:

| id | visit_date | people |
|---|---|---|
| 1 | 2024-01-01 | 10 |
| 2 | 2024-01-02 | 109 |
| 3 | 2024-01-03 | 150 |
| 4 | 2024-01-04 | 99 |
| 5 | 2024-01-05 | 145 |
| 6 | 2024-01-06 | 1455 |
| 7 | 2024-01-07 | 199 |
| 8 | 2024-01-09 | 188 |

**Output:**

| id | visit_date | people |
|---|---|---|
| 5 | 2024-01-05 | 145 |
| 6 | 2024-01-06 | 1455 |
| 7 | 2024-01-07 | 199 |

**Explanation:**
- Days 2 and 3 had >= 100 people, but day 4 had only 99 (sequence broke after 2 days).
- Days 5, 6, and 7 had >= 100 people for 3 consecutive days.
""",
        "test_cases": [
            {
                "case_index": 1,
                "input_json": {
                    "table": "Stadium",
                    "columns": ["id", "visit_date", "people"],
                },
                "expected_output_json": {
                    "columns": ["id", "visit_date", "people"],
                    "rows": [
                        {"id": 5, "visit_date": "2024-01-05", "people": 145},
                        {"id": 6, "visit_date": "2024-01-06", "people": 1455},
                        {"id": 7, "visit_date": "2024-01-07", "people": 199},
                    ],
                },
            }
        ],
    },
]


def clear_coding_seed_data(db: Session) -> None:
    """Purges all old coding problems, test cases, submissions, and legacy study plans."""
    # Delete child tables first to respect foreign keys
    db.query(UserCodingSubmission).delete()
    db.query(TestCase).delete()
    db.query(CodingProblem).delete()
    db.query(StudyPlan).delete()
    db.flush()


def _seed_with_session(db: Session, reset_coding: bool = True) -> Dict[str, int]:
    """Populates the database with topics, quizzes, and the three-tier SQL study plans."""
    init_db()

    counts = {
        "topics": 0,
        "questions": 0,
        "plans": 0,
        "problems": 0,
        "test_cases": 0,
    }

    # 1. Reset coding data if requested to purge legacy dummy/dud rows
    if reset_coding:
        clear_coding_seed_data(db)

    # 2. Seed Practice Topics
    for i, (title, topic, tool, icon) in enumerate(RAW_TOPICS):
        topic_id = slugify(title)
        if not db.get(PracticeTopic, topic_id):
            db.add(PracticeTopic(
                id=topic_id,
                title=title,
                topic=topic,
                tool=tool,
                icon=icon,
                sort_order=i + 1,
            ))
            counts["topics"] += 1

    # 3. Seed Quiz Questions
    for topic_id, q_list in RAW_QUIZZES.items():
        for order_idx, row in enumerate(q_list):
            q_type = row[0]
            q_id = f"{topic_id}-q{order_idx + 1}"
            prompt = row[1]
            options = None
            correct_val = None
            canonical_answer = None

            if q_type == "mcq":
                options = row[2]
                correct_val = str(row[3])
                explanation = row[4]
            elif q_type == "tf":
                correct_val = "true" if row[2] else "false"
                explanation = row[3]
            else:  # fib
                canonical_answer = str(row[2])
                explanation = row[3]

            if not db.get(QuizQuestion, q_id):
                db.add(QuizQuestion(
                    id=q_id,
                    topic_id=topic_id,
                    type=q_type,
                    prompt=prompt,
                    options_json=options,
                    correct_val=correct_val,
                    canonical_answer=canonical_answer,
                    explanation=explanation,
                    order_index=order_idx,
                ))
                counts["questions"] += 1

    # 4. Seed 3 SQL Study Plans
    for pl in SQL_STUDY_PLANS:
        existing_plan = db.get(StudyPlan, pl["id"])
        if not existing_plan:
            db.add(StudyPlan(
                id=pl["id"],
                title=pl["title"],
                subtitle=pl["subtitle"],
                language=pl["language"],
                badge_text=pl["badge_text"],
            ))
            counts["plans"] += 1

    # 5. Seed 15 SQL Coding Problems and Test Cases
    for prob in SQL_CODING_PROBLEMS:
        prob_id = prob["id"]
        existing_prob = db.get(CodingProblem, prob_id)
        if not existing_prob:
            db.add(CodingProblem(
                id=prob_id,
                plan_id=prob["plan_id"],
                title=prob["title"],
                order_index=prob["order_index"],
                difficulty=prob["difficulty"],
                tags_json=prob["tags"],
                language="SQL",
                description_md=prob["description_md"],
                starter_code=prob["starter_code"],
                setup_sql=prob["setup_sql"],
                canonical_solution=prob["canonical_solution"],
            ))
            counts["problems"] += 1
        else:
            existing_prob.title = prob["title"]
            existing_prob.difficulty = prob["difficulty"]
            existing_prob.tags_json = prob["tags"]
            existing_prob.description_md = prob["description_md"]
            existing_prob.starter_code = prob["starter_code"]
            existing_prob.setup_sql = prob["setup_sql"]
            existing_prob.canonical_solution = prob["canonical_solution"]

        # Seed Test Cases
        for tc_data in prob.get("test_cases", []):
            tc_id = f"tc-{prob_id.replace(':', '-')}-{tc_data['case_index']}"
            existing_tc = db.get(TestCase, tc_id)
            if not existing_tc:
                db.add(TestCase(
                    id=tc_id,
                    problem_id=prob_id,
                    case_index=tc_data["case_index"],
                    input_json=tc_data["input_json"],
                    expected_output_json=tc_data["expected_output_json"],
                ))
                counts["test_cases"] += 1
            else:
                existing_tc.input_json = tc_data["input_json"]
                existing_tc.expected_output_json = tc_data["expected_output_json"]

    db.flush()
    return counts


def seed_db(session: Optional[Session] = None, reset_coding: bool = True) -> Dict[str, int]:
    """Seeds the database with canonical practice topics and three curated SQL study plans."""
    try:
        from backend.seed.runner import run_all_seeds
        if session is not None:
            return run_all_seeds(session, reset_coding=reset_coding)
        with get_db() as managed_session:
            return run_all_seeds(managed_session, reset_coding=reset_coding)
    except ImportError:
        if session is not None:
            return _seed_with_session(session, reset_coding=reset_coding)
        with get_db() as managed_session:
            return _seed_with_session(managed_session, reset_coding=reset_coding)


if __name__ == "__main__":
    seeded = seed_db(reset_coding=True)
    print("Database seeding completed cleanly:")
    for k, v in seeded.items():
        print(f"  {k}: {v}")

