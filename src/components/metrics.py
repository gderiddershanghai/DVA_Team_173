#code for sharpe ratio is taken from https://www.youtube.com/watch?v=r7JuZOzNiQE
import pandas as pd
import numpy as np
import yfinance as yf  #need to be installed


#return sharpe ratio, treynor ratio, alpha, and beta for chosen stock
def metrics(chosen_stock, start_date, end_date, risk_free_rate_param):
    #download data from yfinance(yahoo finance)
    benchmark = '^GSPC'
    stock_data = yf.download(chosen_stock, start=start_date,end=end_date,auto_adjust=False)
    benchmark_data = yf.download(benchmark, start=start_date,end=end_date,auto_adjust=False)

    #make into dataframe
    stock_returns = stock_data['Adj Close'].pct_change().dropna()
    benchmark_returns = benchmark_data['Adj Close'].pct_change().dropna()

    #merge both stock_returns and benchmark_returns
    returns = pd.merge(stock_returns,benchmark_returns,on="Date")

    #calculate alpha and beta
    x = returns.iloc[:,1]
    y = returns.iloc[:,0]

    X = np.vstack([x,np.ones(len(x))]).T
    y
    beta, alpha = np.linalg.lstsq(X,y,rcond=None)[0]

    #risk free rate / US treasurey yield
    #can choose between 13 weeks T-Bill / 5 year treasurey / 10 years treasure / 30 years treasure
    #13 weeks ^IRX
    #5 years ^FVX
    #10 years ^TNX
    #30 year ^TYX

    #treasury yield data
    if risk_free_rate_param == 5:
        treasury = "^FVX"
    elif risk_free_rate_param == 10:
        treasury = "^TNX"
    elif risk_free_rate_param == 30:
        treasury = "^TYX"
    else:
        treasury = "^IRX"

    treasury_data = yf.download(treasury, start=start_date,end=end_date)
    #treasury_data
    treasury_returns = treasury_data['Close'].pct_change().dropna()
    treasury_returns
    sum = 0
    for i in range(treasury_returns.shape[0]-1):
        sum = sum + (treasury_returns.iloc[i+1,0] - treasury_returns.iloc[i,0])
    risk_free_rate = sum/(treasury_returns.shape[0]-1)


    #sharpe ratio
    sum = 0
    diff_list = []
    for i in range(len(y)-1):
        diff_list.append(returns.iloc[i+1,0] - returns.iloc[i,0])
        sum = sum + (returns.iloc[i+1,0] - returns.iloc[i,0])
    avg = sum/(len(y)-1)
    diff_np = np.array(diff_list)
    std = np.std(diff_np)
    sharpe_ratio = (avg - risk_free_rate) / std

    #treynor ratio 
    treynor_ratio = (avg - risk_free_rate) / beta

    return sharpe_ratio, treynor_ratio, alpha, beta