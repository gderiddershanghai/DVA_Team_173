from fastapi import FastAPI
from fastapi.responses import JSONResponse
from datetime import datetime

app = FastAPI()

# Endpoint for correlated stocks
@app.get("/correlated")
async def get_correlated_stocks(startDate: str, endDate: str):
    # Mock data for most and least correlated stocks
    most_correlated = {
        "stock": "Apple",
        "data": [
            {"date": "2023-01-01T00:00:00.000Z", "value": 130},
            {"date": "2023-01-02T00:00:00.000Z", "value": 135},
            {"date": "2023-01-03T00:00:00.000Z", "value": 140},
            {"date": "2023-01-04T00:00:00.000Z", "value": 145},
            {"date": "2023-01-05T00:00:00.000Z", "value": 150},
        ],
    }
    least_correlated = {
        "stock": "CompanyX",
        "data": [
            {"date": "2023-01-01T00:00:00.000Z", "value": 70},
            {"date": "2023-01-02T00:00:00.000Z", "value": 65},
            {"date": "2023-01-03T00:00:00.000Z", "value": 60},
            {"date": "2023-01-04T00:00:00.000Z", "value": 55},
            {"date": "2023-01-05T00:00:00.000Z", "value": 50},
        ],
    }
    return JSONResponse(content={"most": most_correlated, "least": least_correlated})

# Endpoint for sentiment analysis
@app.get("/sentiments")
async def get_sentiments():
    # Mock data for sentiment analysis
    sentiments = [
        {"name": "Revenue", "value": 30},
        {"name": "Profit", "value": 20},
        {"name": "Expenses", "value": -15},
        {"name": "Growth", "value": 25},
        {"name": "Debt", "value": -10},
    ]
    return JSONResponse(content=sentiments)

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)