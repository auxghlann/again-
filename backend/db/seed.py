import json
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.db.database import get_db, init_db
from backend.db.models import CodingProblem, PracticeTopic, QuizQuestion, StudyPlan, TestCase


def slugify(text: str) -> str:
    """Converts a string to a URL-safe lowercase slug matching the prototype."""
    text = text.lower().strip()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")



# ============================================================
# Canonical Seed Fixtures (Extracted from Prototype)
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

RAW_PLANS = [
    {
        "id": "sql-50",
        "title": "SQL 50",
        "subtitle": "Crack SQL Interview in 50 Qs",
        "language": "SQL",
        "badge_text": "SQL",
        "problems": [
            ("Recyclable and Low Fat Products", "Easy", ["Filtering", "SELECT"]),
            ("Find Customer Referee", "Easy", ["Filtering"]),
            ("Big Countries", "Easy", ["Filtering"]),
            ("Article Views I", "Easy", ["Filtering"]),
            ("Invalid Tweets", "Easy", ["String"]),
            ("Replace Employee ID With The Unique Identifier", "Easy", ["Joins"]),
            ("Product Sales Analysis I", "Easy", ["Joins"]),
            ("Customer Who Visited but Did Not Make Any Transactions", "Easy", ["Joins"]),
            ("Rising Temperature", "Easy", ["Joins", "Date"]),
            ("Average Time of Process per Machine", "Easy", ["Aggregation"]),
            ("Employee Bonus", "Easy", ["Joins"]),
            ("Students and Examinations", "Easy", ["Joins"]),
            ("Managers with at Least 5 Direct Reports", "Medium", ["Joins", "Aggregation"]),
            ("Confirmation Rate", "Medium", ["Aggregation", "CASE"]),
            ("Not Boring Movies", "Easy", ["Sorting"]),
            ("Average Selling Price", "Easy", ["Aggregation"]),
            ("Project Employees I", "Easy", ["Aggregation"]),
            ("Percentage of Users Attended a Contest", "Easy", ["Aggregation"]),
            ("Queries Quality and Percentage", "Easy", ["Aggregation"]),
            ("Monthly Transactions I", "Medium", ["Aggregation", "Date"]),
        ],
    },
    {
        "id": "advanced-sql",
        "title": "Advanced SQL",
        "subtitle": "Window functions, CTEs and tricky joins",
        "language": "SQL",
        "badge_text": "SQL+",
        "problems": [
            ("Trips and Users", "Hard", ["Joins", "Filtering"]),
            ("Human Traffic of Stadium", "Hard", ["Window"]),
            ("Hopper Company Queries I", "Hard", ["CTE"]),
            ("Median Employee Salary", "Hard", ["Window"]),
            ("Game Play Analysis V", "Hard", ["Window"]),
            ("Department Top Three Salaries", "Hard", ["Window", "Dense Rank"]),
            ("Department Highest Salary", "Medium", ["Join", "Aggregation"]),
            ("Rank Scores", "Medium", ["Window", "Dense Rank"]),
            ("Nth Highest Salary", "Medium", ["Functions"]),
            ("Consecutive Available Seats", "Easy", ["Self Join"]),
        ],
    },
    {
        "id": "python-basics",
        "title": "Python Fundamentals",
        "subtitle": "Core patterns for coding interviews",
        "language": "Python",
        "badge_text": "PY",
        "problems": [
            ("Two Sum", "Easy", ["Array", "Hash Map"]),
            ("Valid Anagram", "Easy", ["String", "Hash Map"]),
            ("Contains Duplicate", "Easy", ["Array", "Set"]),
            ("Group Anagrams", "Medium", ["Hash Map", "String"]),
            ("Top K Frequent Elements", "Medium", ["Heap", "Hash Map"]),
            ("Valid Palindrome", "Easy", ["Two Pointers", "String"]),
            ("Product of Array Except Self", "Medium", ["Array", "Prefix"]),
            ("Longest Consecutive Sequence", "Medium", ["Hash Set"]),
            ("Merge Intervals", "Medium", ["Sorting", "Array"]),
            ("Valid Parentheses", "Easy", ["Stack"]),
            ("Reverse Linked List", "Easy", ["Linked List"]),
            ("Word Frequency With Dict Comprehension", "Easy", ["Dictionary"]),
        ],
    },
    {
        "id": "pandas-30",
        "title": "Pandas 30 Days",
        "subtitle": "Data wrangling with DataFrames",
        "language": "Python",
        "badge_text": "PD",
        "problems": [
            ("Big Countries", "Easy", ["Filtering"]),
            ("Recyclable and Low Fat Products", "Easy", ["Filtering"]),
            ("Calculate Special Bonus", "Easy", ["Apply"]),
            ("Fix Names in a Table", "Easy", ["Strings"]),
            ("Find Users With Valid E-Mails", "Easy", ["Regex"]),
            ("Rank Scores", "Medium", ["Ranking"]),
            ("Second Highest Salary", "Medium", ["Sorting"]),
            ("Drop Duplicate Emails", "Easy", ["Dedup"]),
            ("Pivot Rows and Columns", "Medium", ["Reshape"]),
            ("Department Highest Salary", "Medium", ["GroupBy"]),
        ],
    },
    {
        "id": "pyspark-essentials",
        "title": "PySpark Essentials",
        "subtitle": "Transformations you use every day",
        "language": "PySpark",
        "badge_text": "SPK",
        "problems": [
            ("Select and Rename Columns", "Easy", ["DataFrame"]),
            ("Filter Nulls and Bad Records", "Easy", ["Cleaning"]),
            ("Join Orders With Customers", "Medium", ["Joins"]),
            ("Window Rank per Group", "Medium", ["Window"]),
            ("Explode Nested Arrays", "Medium", ["Nested Data"]),
            ("Deduplicate by Latest Timestamp", "Medium", ["Window"]),
            ("Broadcast Join Optimization", "Hard", ["Performance"]),
            ("Incremental MERGE INTO a Delta Table", "Hard", ["Delta Lake"]),
        ],
    },
]

TWO_SUM_STARTER = """class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Write your code below
        pass
"""

TWO_SUM_SOLUTION = """class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            diff = target - num
            if diff in seen:
                return [seen[diff], i]
            seen[num] = i
        return []
"""

TWO_SUM_MD = """Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

### Example 1
```text
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
```

### Constraints
* `2 <= nums.length <= 10^4`
* `-10^9 <= nums[i] <= 10^9`
* `-10^9 <= target <= 10^9`
* Only one valid answer exists.
"""

RECYCLABLE_SQL_STARTER = """-- Write your SQL query below
SELECT
    product_id
FROM
    Products;
"""

RECYCLABLE_SQL_SETUP = """CREATE TEMP TABLE Products (
    product_id INT,
    low_fats CHAR(1),
    recyclable CHAR(1)
);
INSERT INTO Products (product_id, low_fats, recyclable) VALUES
(0, 'Y', 'N'),
(1, 'Y', 'Y'),
(2, 'N', 'Y'),
(3, 'Y', 'Y'),
(4, 'N', 'N');
"""

RECYCLABLE_SQL_SOLUTION = """SELECT product_id FROM Products WHERE low_fats = 'Y' AND recyclable = 'Y';"""

RECYCLABLE_SQL_MD = """Write a solution to find the ids of products that are both low fat and recyclable.

Return the result table in any order.

### Table Schema: `Products`
* `product_id` (int) - Primary key
* `low_fats` (char) - 'Y' if low fat, 'N' otherwise
* `recyclable` (char) - 'Y' if recyclable, 'N' otherwise
"""


def _seed_with_session(db: Session) -> Dict[str, int]:
    """Internal seeder populating data using an active SQLAlchemy Session."""
    init_db()

    counts = {
        "topics": 0,
        "questions": 0,
        "plans": 0,
        "problems": 0,
        "test_cases": 0,
    }

    # 1. Seed Practice Topics
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

    # 2. Seed Quiz Questions
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

    # 3. Seed Study Plans
    for pl in RAW_PLANS:
        if not db.get(StudyPlan, pl["id"]):
            db.add(StudyPlan(
                id=pl["id"],
                title=pl["title"],
                subtitle=pl["subtitle"],
                language=pl["language"],
                badge_text=pl["badge_text"],
            ))
            counts["plans"] += 1

        # 4. Seed Coding Problems
        for p_idx, (p_title, diff, tags) in enumerate(pl["problems"]):
            prob_slug = slugify(p_title)
            prob_id = f"{pl['id']}:{prob_slug}"
            lang = pl["language"]

            # Detailed fixtures for canonical problems
            if prob_id == "python-basics:two-sum":
                starter = TWO_SUM_STARTER
                desc = TWO_SUM_MD
                solution = TWO_SUM_SOLUTION
                setup = None
            elif prob_id == "sql-50:recyclable-and-low-fat-products":
                starter = RECYCLABLE_SQL_STARTER
                desc = RECYCLABLE_SQL_MD
                solution = RECYCLABLE_SQL_SOLUTION
                setup = RECYCLABLE_SQL_SETUP
            else:
                starter = (
                    f"-- Solution for {p_title}\nSELECT * FROM table_name;"
                    if lang == "SQL"
                    else f"def solution(data):\n    # TODO: Implement {p_title}\n    pass\n"
                )
                desc = f"Solve `{p_title}`.\n\nCategorized under: {', '.join(tags)}."
                solution = starter
                setup = None

            if not db.get(CodingProblem, prob_id):
                db.add(CodingProblem(
                    id=prob_id,
                    plan_id=pl["id"],
                    title=p_title,
                    order_index=p_idx + 1,
                    difficulty=diff,
                    tags_json=tags,
                    language=lang,
                    description_md=desc,
                    starter_code=starter,
                    setup_sql=setup,
                    canonical_solution=solution,
                ))
                counts["problems"] += 1

    # 5. Seed Test Cases for Two Sum and Recyclable Products
    two_sum_cases = [
        ({"nums": [2, 7, 11, 15], "target": 9}, {"output": [0, 1]}),
        ({"nums": [3, 2, 4], "target": 6}, {"output": [1, 2]}),
        ({"nums": [3, 3], "target": 6}, {"output": [0, 1]}),
    ]
    for c_idx, (inp, out) in enumerate(two_sum_cases):
        tc_id = f"tc-two-sum-{c_idx + 1}"
        if not db.get(TestCase, tc_id):
            db.add(TestCase(
                id=tc_id,
                problem_id="python-basics:two-sum",
                case_index=c_idx + 1,
                input_json=inp,
                expected_output_json=out,
            ))
            counts["test_cases"] += 1

    rec_case = (
        {"table": "Products", "columns": ["product_id", "low_fats", "recyclable"]},
        {"columns": ["product_id"], "rows": [{"product_id": 1}, {"product_id": 3}]},
    )
    if not db.get(TestCase, "tc-rec-sql-1"):
        db.add(TestCase(
            id="tc-rec-sql-1",
            problem_id="sql-50:recyclable-and-low-fat-products",
            case_index=1,
            input_json=rec_case[0],
            expected_output_json=rec_case[1],
        ))
        counts["test_cases"] += 1

    db.flush()
    return counts


def seed_db(session: Optional[Session] = None) -> Dict[str, int]:
    """Seeds the SQLite database with canonical topics, questions, study plans, problems, and test cases."""
    if session is not None:
        return _seed_with_session(session)
    with get_db() as managed_session:
        return _seed_with_session(managed_session)


if __name__ == "__main__":
    seeded = seed_db()
    print("Database seeding completed cleanly:")
    for k, v in seeded.items():
        print(f"  {k}: {v}")


