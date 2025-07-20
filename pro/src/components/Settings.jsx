import { X, Moon, Sun, Type, Hash } from 'lucide-react';

const Settings = ({ 
  onClose, 
  fontSize, 
  onFontSizeChange, 
  decimalPrecision, 
  onDecimalPrecisionChange,
  isDarkMode,
  onThemeChange 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 max-w-[90vw]">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              {isDarkMode ? <Moon className="w-4 h-4 mr-2" /> : <Sun className="w-4 h-4 mr-2" />}
              Theme
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => onThemeChange(false)}
                className={`flex-1 p-3 rounded-lg border transition-colors ${
                  !isDarkMode 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Sun className="w-4 h-4 mx-auto mb-1" />
                <div className="text-xs">Light</div>
              </button>
              <button
                onClick={() => onThemeChange(true)}
                className={`flex-1 p-3 rounded-lg border transition-colors ${
                  isDarkMode 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Moon className="w-4 h-4 mx-auto mb-1" />
                <div className="text-xs">Dark</div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <Type className="w-4 h-4 mr-2" />
              Font Size: {fontSize}px
            </label>
            <input
              type="range"
              min="10"
              max="24"
              value={fontSize}
              onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>10px</span>
              <span>24px</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <Hash className="w-4 h-4 mr-2" />
              Decimal Precision: {decimalPrecision} digits
            </label>
            <input
              type="range"
              min="0"
              max="6"
              value={decimalPrecision}
              onChange={(e) => onDecimalPrecisionChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>0</span>
              <span>6</span>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Quick Tips:</h3>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Use = for formulas: =3.50 + 8.20</li>
              <li>• Reference lines: @1 + @2</li>
              <li>• Variables: tax = 0.1</li>
              <li>• Functions: sum(), avg(), min(), max()</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
