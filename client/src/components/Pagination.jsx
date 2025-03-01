import React from 'react';
import ReactPaginate from 'react-paginate';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const handlePageClick = (data) => {
    onPageChange(data.selected + 1);
  };

  return (
    <div className="pagination-container flex justify-center mt-8">
      <ReactPaginate
        previousLabel={'← Previous'}
        nextLabel={'Next →'}
        breakLabel={'...'}
        pageCount={totalPages}
        marginPagesDisplayed={2}
        pageRangeDisplayed={3}
        onPageChange={handlePageClick}
        containerClassName={'flex space-x-2'}
        pageClassName={
          'px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-blue-500 hover:text-white transition-colors'
        }
        previousClassName={
          'px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-blue-500 hover:text-white transition-colors'
        }
        nextClassName={
          'px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-blue-500 hover:text-white transition-colors'
        }
        breakClassName={
          'px-4 py-2 border border-gray-300 rounded-md cursor-default text-gray-500'
        }
        activeClassName={'bg-blue-500 text-white border-blue-500'}
        disabledClassName={'opacity-50 cursor-not-allowed'}
        forcePage={currentPage - 1}
      />
    </div>
  );
};

export default Pagination;
