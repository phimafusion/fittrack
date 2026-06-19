// Mocking DOM elements
const mockContainer = {
  innerHTML: '',
  appendChild: function(child) {
    this.innerHTML += child.outerHTML || '<mock-node></mock-node>';
  }
};

const mockDOM = {
  historyList: mockContainer,
  exercisesList: mockContainer
};

describe('ui.js', () => {
  beforeEach(() => {
    mockContainer.innerHTML = '';
  });

  it('uiRenderHistory should display empty state if no workouts', async () => {
    const { uiRenderHistory } = await import('../js/ui.js');
    
    const mockEmptyState = { style: { display: 'none' } };
    const mockList = { style: { display: 'block' }, innerHTML: '' };
    
    uiRenderHistory([], mockList, mockEmptyState);
    
    expect(mockEmptyState.style.display).toBe('block');
    expect(mockList.style.display).toBe('none');
  });

  it('uiRenderHistory should list workouts', async () => {
    const { uiRenderHistory } = await import('../js/ui.js');
    
    const mockEmptyState = { style: { display: 'none' } };
    const mockList = { style: { display: 'block' }, innerHTML: '' };
    const workouts = [{ id: '1', name: 'Workout 1', date: new Date().toISOString(), duration: 30, volume: 1000, exercises: [] }];
    
    uiRenderHistory(workouts, mockList, mockEmptyState);
    
    expect(mockEmptyState.style.display).toBe('none');
    expect(mockList.style.display).toBe('block');
    expect(mockList.innerHTML).toContain('Workout 1');
    expect(mockList.innerHTML).toContain('30 min');
  });

  it('uiRenderExercisesLibrary should list exercises and sort them alphabetically', async () => {
    const { uiRenderExercisesLibrary } = await import('../js/ui.js');
    
    const container = { innerHTML: '' };
    const exercises = [
      { id: 'b', name: 'B Exercise', category: 'Brust' },
      { id: 'a', name: 'A Exercise', category: 'Brust' }
    ];
    
    uiRenderExercisesLibrary(exercises, null, 'all', container, '', false, {});
    
    // Check if sorted
    expect(container.innerHTML.indexOf('A Exercise') < container.innerHTML.indexOf('B Exercise')).toBe(true);
  });
  
  it('uiRenderExercisesLibrary should filter by category and query', async () => {
    const { uiRenderExercisesLibrary } = await import('../js/ui.js');
    
    const container = { innerHTML: '' };
    const exercises = [
      { id: 'b', name: 'B Exercise', category: 'Brust' },
      { id: 'a', name: 'A Exercise', category: 'Beine' }
    ];
    
    // Filter by Brust
    uiRenderExercisesLibrary(exercises, null, 'brust', container, '', false, {});
    expect(container.innerHTML).toContain('B Exercise');
    expect(container.innerHTML).not.toContain('A Exercise');
    
    // Filter by query 'a'
    uiRenderExercisesLibrary(exercises, null, 'all', container, 'a', false, {});
    expect(container.innerHTML).not.toContain('B Exercise');
    expect(container.innerHTML).toContain('A Exercise');
  });
});
