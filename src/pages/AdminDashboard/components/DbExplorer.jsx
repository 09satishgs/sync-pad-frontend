import React from "react";

export const DbExplorer = ({
  tables,
  selectedTable,
  setSelectedTable,
  tableData,
  currentPage,
  setCurrentPage,
  limit,
  loadingData,
  dbError,
  headings,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="admin-db-selector">
        <label
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-muted)",
          }}
        >
          {headings.DB.SELECT_TABLE}
        </label>
        <select
          className="select-type"
          style={{ width: "200px", height: "32px" }}
          value={selectedTable}
          onChange={(e) => {
            setSelectedTable(e.target.value);
            setCurrentPage(1);
          }}
        >
          {tables.map((t) => (
            <option key={t} value={t}>
              📄 {t}
            </option>
          ))}
        </select>
      </div>

      {dbError && <div className="toast toast-error">{dbError}</div>}

      {loadingData ? (
        <div
          style={{
            padding: "20px",
            color: "var(--text-muted)",
            fontSize: "13px",
          }}
        >
          Loading table data...
        </div>
      ) : tableData.length === 0 ? (
        <div
          style={{
            padding: "20px",
            color: "var(--text-muted)",
            fontSize: "13px",
          }}
        >
          {headings.DB.NO_DATA}
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                {Object.keys(tableData[0] || {}).map((k) => (
                  <th key={k}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, idx) => (
                    <td key={idx}>
                      {val === null || val === undefined ? (
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          NULL
                        </span>
                      ) : typeof val === "object" ? (
                        JSON.stringify(val)
                      ) : (
                        String(val)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="admin-pagination">
            <span className="admin-pagination-info">
              {headings.DB.PAGE_INFO(currentPage)}
            </span>
            <div className="admin-pagination-actions">
              <button
                className="btn"
                style={{
                  height: "28px",
                  padding: "0 12px",
                  fontSize: "12px",
                }}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ◀ Prev Page
              </button>
              <button
                className="btn"
                style={{
                  height: "28px",
                  padding: "0 12px",
                  fontSize: "12px",
                }}
                disabled={tableData.length < limit}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next Page ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DbExplorer;
